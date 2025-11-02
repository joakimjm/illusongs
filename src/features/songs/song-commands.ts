import type { PoolClient } from "pg";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { mapSongStoToDetailDto } from "@/features/songs/song-mapping";
import type {
  CreateSongInput,
  CreateSongVerseInput,
  SongDetailDto,
} from "@/features/songs/song-types";
import type { SongSto, SongTagSto, SongVerseSto } from "@/features/songs/song-stos";

const insertTag = async (client: PoolClient, tagName: string): Promise<void> => {
  await client.query(
    `
      INSERT INTO tags (name, display_name)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING
    `,
    [tagName, tagName],
  );
};

const insertSongTag = async (
  client: PoolClient,
  songId: string,
  tagName: string,
): Promise<SongTagSto> => {
  const result = await client.query<SongTagSto>(
    `
      INSERT INTO song_tags (id, song_id, tag_name)
      VALUES (gen_random_uuid(), $1, $2)
      ON CONFLICT (song_id, tag_name) DO NOTHING
      RETURNING tag_name::text AS tag_name
    `,
    [songId, tagName],
  );

  if (result.rowCount > 0) {
    return result.rows[0];
  }

  const fallback = await client.query<SongTagSto>(
    `
      SELECT tag_name::text AS tag_name
      FROM song_tags
      WHERE song_id = $1 AND tag_name = $2
    `,
    [songId, tagName],
  );

  return fallback.rows[0] ?? { tag_name: tagName };
};

const insertSongVerse = async (
  client: PoolClient,
  songId: string,
  verse: CreateSongVerseInput,
): Promise<SongVerseSto> => {
  const result = await client.query<SongVerseSto>(
    `
      INSERT INTO song_verses (
        id,
        song_id,
        sequence_number,
        lyric_text,
        illustration_url
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4
      )
      RETURNING
        id,
        song_id,
        sequence_number,
        lyric_text,
        illustration_url,
        created_at,
        updated_at
    `,
    [
      songId,
      verse.sequenceNumber,
      verse.lyricText,
      verse.illustrationUrl,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to insert song verse.");
  }

  return row;
};

const insertSong = async (
  client: PoolClient,
  input: CreateSongInput,
): Promise<SongSto> => {
  const result = await client.query<SongSto>(
    `
      INSERT INTO songs (
        slug,
        title,
        language_code,
        is_published
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        slug,
        title,
        language_code,
        is_published,
        created_at,
        updated_at
    `,
    [input.slug, input.title, input.languageCode, input.isPublished],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to insert song.");
  }

  return row;
};

export const createSong = async (
  input: CreateSongInput,
): Promise<SongDetailDto> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const song = await insertSong(client, input);

    const sortedTags = [...input.tags]
      .map((tag) => tag.toLowerCase())
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .sort((a, b) => a.localeCompare(b, "en"));

    const tagRecords: SongTagSto[] = [];

    for (const tag of sortedTags) {
      await insertTag(client, tag);
      const record = await insertSongTag(client, song.id, tag);
      tagRecords.push(record);
    }

    const verseInputs = [...input.verses].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber,
    );

    const verseRecords: SongVerseSto[] = [];
    for (const verse of verseInputs) {
      const record = await insertSongVerse(client, song.id, verse);
      verseRecords.push(record);
    }

    return mapSongStoToDetailDto(song, tagRecords, verseRecords);
  });
};
