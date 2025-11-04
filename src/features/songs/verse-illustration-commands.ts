import type { PoolClient } from "pg";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import type { SongVerseSto } from "@/features/songs/song-stos";

export class SongVerseNotFoundError extends Error {}

export type UpdateVerseIllustrationInput = {
  songId: string;
  verseId: string;
  illustrationUrl: string | null;
};

const updateIllustrationInternal = async (
  client: PoolClient,
  input: UpdateVerseIllustrationInput,
): Promise<SongVerseSto> => {
  const result = await client.query<SongVerseSto>(
    `
      UPDATE song_verses
      SET
        illustration_url = $3,
        updated_at = NOW()
      WHERE id = $1 AND song_id = $2
      RETURNING
        id,
        song_id,
        sequence_number,
        lyric_text,
        illustration_url,
        created_at,
        updated_at
    `,
    [input.verseId, input.songId, input.illustrationUrl],
  );

  const updatedVerse = result.rows[0];

  if (!updatedVerse) {
    throw new SongVerseNotFoundError("Song verse not found.");
  }

  return updatedVerse;
};

export const updateVerseIllustrationUrl = async (
  input: UpdateVerseIllustrationInput,
): Promise<SongVerseSto> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(
    async (client) => await updateIllustrationInternal(client, input),
  );
};
