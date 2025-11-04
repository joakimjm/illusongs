import { expect, test } from "vitest";
import {
  createSongDraft,
  InvalidSongDraftError,
  slugifySongTitle,
  splitSongDraftVerses,
} from "@/features/songs/song-admin-commands";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";
import { withTestPool } from "@/features/testing/postgres-test-utils";

const TABLES: readonly string[] = [
  "song_generation_verse_artifacts",
  "song_generation_jobs",
  "song_tags",
  "song_verses",
  "songs",
  "tags",
];

registerDatabaseTestSuite({ truncateTables: TABLES });

test("splitSongDraftVerses splits on blank lines", () => {
  const verses = splitSongDraftVerses(
    "Vers 1 linje 1\nVers 1 linje 2\n\n Vers 2 linje 1\n\nVers 3",
  );

  expect(verses).toEqual([
    "Vers 1 linje 1\nVers 1 linje 2",
    "Vers 2 linje 1",
    "Vers 3",
  ]);
});

test("slugifySongTitle normalizes diacritics", () => {
  const slug = slugifySongTitle("  Søde Ænder i Skoven!  ");
  expect(slug).toBe("sode-aender-i-skoven");
});

test("createSongDraft inserts unpublished song with pending generation job", async () => {
  const song = await createSongDraft({
    title: "Test Sang",
    versesText: "Vers 1\nLinje 2\n\nVers 2",
  });

  expect(song.title).toBe("Test Sang");
  expect(song.isPublished).toBe(false);
  expect(song.verses).toHaveLength(2);
  expect(song.verses[0]?.sequenceNumber).toBe(1);
  expect(song.verses[0]?.illustrationUrl).toBeNull();

  const jobs = await withTestPool(async (pool) => {
    const result = await pool.query<{
      status: string;
      song_id: string;
      verse_id: string;
    }>(
      `
        SELECT status, song_id, verse_id
        FROM song_generation_jobs
        ORDER BY created_at
      `,
    );
    return result.rows;
  });

  expect(jobs).toHaveLength(2);
  const expectedVerseIds = new Set(song.verses.map((verse) => verse.id));

  jobs.forEach((row) => {
    expect(row.status).toBe("pending");
    expect(row.song_id).toBe(song.id);
    expect(expectedVerseIds.has(row.verse_id)).toBe(true);
  });
});

test("createSongDraft throws when verses are missing", async () => {
  await expect(
    createSongDraft({
      title: "Tom Sang",
      versesText: "   ",
    }),
  ).rejects.toThrowError(InvalidSongDraftError);
});
