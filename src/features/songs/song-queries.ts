import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import {
  mapSongStoToDetailDto,
  mapSongSummaryStoToDto,
} from "@/features/songs/song-mapping";
import type {
  SongDetailDto,
  SongSummaryDto,
} from "@/features/songs/song-types";
import type {
  SongSto,
  SongSummarySto,
  SongTagMetadataSto,
  SongTagSto,
  SongVerseSto,
} from "./song-stos";
import type { TagMetadata } from "./song-tag-categories";

export const fetchPublishedSongs = async (): Promise<SongSummaryDto[]> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<SongSummarySto>(
      `
        SELECT
          s.id,
          s.slug,
          s.title,
          s.language_code,
          s.is_published,
          s.created_at,
          s.updated_at,
          preview.illustration_url AS cover_image_url,
          COALESCE(
            ARRAY_AGG(st.tag_name::text ORDER BY st.tag_name::text)
              FILTER (WHERE st.tag_name IS NOT NULL),
            '{}'::text[]
          ) AS tag_names
        FROM songs s
        LEFT JOIN song_tags st
          ON st.song_id = s.id
        LEFT JOIN LATERAL (
          SELECT
            illustration_url
          FROM song_verses sv
          WHERE sv.song_id = s.id AND sv.illustration_url IS NOT NULL
          ORDER BY sv.sequence_number ASC
          LIMIT 1
        ) AS preview ON true
        WHERE s.is_published = true
        GROUP BY
          s.id,
          s.slug,
          s.title,
          s.language_code,
          s.is_published,
          s.created_at,
          s.updated_at,
          preview.illustration_url
        ORDER BY s.title, s.created_at DESC
      `,
    );

    return result.rows.map(mapSongSummaryStoToDto);
  });
};

export const findSongBySlug = async (
  slug: string,
): Promise<SongDetailDto | null> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const songResult = await client.query<SongSto>(
      `
        SELECT
          id,
          slug,
          title,
          language_code,
          is_published,
          created_at,
          updated_at
        FROM songs
        WHERE slug = $1
        LIMIT 1
      `,
      [slug],
    );

    const song = songResult.rows[0];
    if (!song) {
      return null;
    }

    const tagResult = await client.query<SongTagSto>(
      `
        SELECT
          tag_name::text AS tag_name
        FROM song_tags
        WHERE song_id = $1
        ORDER BY tag_name
      `,
      [song.id],
    );

    const verseResult = await client.query<SongVerseSto>(
      `
        SELECT
          id,
          song_id,
          sequence_number,
          lyric_text,
          illustration_url,
          created_at,
          updated_at
        FROM song_verses
        WHERE song_id = $1
        ORDER BY sequence_number
      `,
      [song.id],
    );

    return mapSongStoToDetailDto(song, tagResult.rows, verseResult.rows);
  });
};

export const fetchTagMetadata = async (
  tagNames: readonly string[],
): Promise<TagMetadata[]> => {
  if (tagNames.length === 0) {
    return [];
  }

  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<SongTagMetadataSto>(
      `
        SELECT
          t.name,
          t.display_name,
          t.category_slug,
          c.label AS category_label
        FROM tags t
        LEFT JOIN tag_categories c
          ON c.slug = t.category_slug
        WHERE t.name = ANY($1)
      `,
      [tagNames],
    );

    return result.rows.map((row) => ({
      name: row.name,
      displayName: row.display_name,
      categorySlug: row.category_slug,
      categoryLabel: row.category_label,
    }));
  });
};
