import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";
import { withTestPool } from "@/features/testing/postgres-test-utils";
import {
  SongVerseNotFoundError,
  updateVerseIllustrationUrl,
} from "./verse-illustration-commands";

const TABLES: readonly string[] = ["song_verses", "songs"];

registerDatabaseTestSuite({ truncateTables: TABLES });

const seedSongWithVerse = async (): Promise<{
  songId: string;
  verseId: string;
}> =>
  await withTestPool(async (pool) => {
    const songResult = await pool.query<{ id: string }>(
      `
        INSERT INTO songs (id, slug, title, language_code, is_published)
        VALUES (gen_random_uuid(), 'test-song', 'Test Song', 'da', true)
        RETURNING id::text AS id
      `,
    );

    const songId = songResult.rows[0]?.id;
    if (!songId) {
      throw new Error("Failed to seed song for verse illustration test.");
    }

    const verseResult = await pool.query<{ id: string }>(
      `
        INSERT INTO song_verses (
          id,
          song_id,
          sequence_number,
          lyric_text,
          illustration_url
        )
        VALUES (gen_random_uuid(), $1, 1, 'Lyrics', null)
        RETURNING id::text AS id
      `,
      [songId],
    );

    const verseId = verseResult.rows[0]?.id;
    if (!verseId) {
      throw new Error("Failed to seed verse for illustration test.");
    }

    return { songId, verseId };
  });

test("updateVerseIllustrationUrl persists illustration url for verse", async () => {
  const { songId, verseId } = await seedSongWithVerse();
  const illustrationUrl = "https://cdn.example.com/verse/main.webp";

  const updatedVerse = await updateVerseIllustrationUrl({
    songId,
    verseId,
    illustrationUrl,
  });

  expect(updatedVerse.id).toBe(verseId);
  expect(updatedVerse.illustration_url).toBe(illustrationUrl);

  const persisted = await withTestPool(async (pool) => {
    const result = await pool.query<{ illustration_url: string | null }>(
      `
        SELECT illustration_url
        FROM song_verses
        WHERE id = $1
      `,
      [verseId],
    );
    return result.rows[0]?.illustration_url ?? null;
  });

  expect(persisted).toBe(illustrationUrl);
});

test("updateVerseIllustrationUrl throws when verse does not exist", async () => {
  await expect(
    updateVerseIllustrationUrl({
      songId: randomUUID(),
      verseId: randomUUID(),
      illustrationUrl: "https://cdn.example.com/missing.webp",
    }),
  ).rejects.toThrowError(SongVerseNotFoundError);
});
