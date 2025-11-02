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
  SongTagSto,
  SongVerseSto,
} from "./song-stos";

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
          COALESCE(
            ARRAY_AGG(st.tag_name::text ORDER BY st.tag_name::text)
              FILTER (WHERE st.tag_name IS NOT NULL),
            '{}'::text[]
          ) AS tag_names
        FROM songs s
        LEFT JOIN song_tags st
          ON st.song_id = s.id
        WHERE s.is_published = true
        GROUP BY
          s.id,
          s.slug,
          s.title,
          s.language_code,
          s.is_published,
          s.created_at,
          s.updated_at
        ORDER BY s.created_at DESC, s.id DESC
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
