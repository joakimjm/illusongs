import { expect, test } from "vitest";
import {
  createSongDraft,
  InvalidSongDraftError,
  InvalidSongVerseUpdateError,
  reconcileSongVerses,
  reconcileVersesForSongUpdate,
  slugifySongTitle,
  splitSongDraftVerses,
} from "@/features/songs/song-admin-commands";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";
import { withTestPool } from "@/features/testing/postgres-test-utils";

const TABLES: readonly string[] = [
  "song_generation_conversations",
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

test("reconcileVersesForSongUpdate matches grammar/whitespace rewrite for same verse", () => {
  const before =
    "Jens Hansen havde en bondegård,\u2028 Ih-ah, ih-ah, åh, Og på den gård der var en Hest Ih-ah, ih-ah, åh\u2028 Det var prr-prr her, det var prr- prr der,\u2028prr her, prr der, alle steder prr.\u2028 Jens Hansen havde en bondegård\u2028Ih-ah, ih-ah, åh";
  const after = `Jens Hansen havde en bondegård,
Ih-ah, ih-ah, åh,
Og på den gård der var en Hest
Ih-ah, ih-ah, åh
Det var pruh-pruh her, det var pruh-pruh der,
pruh her, pruh der, alle steder pruh.
Jens Hansen havde en bondegård
Ih-ah, ih-ah, åh`;

  const plan = reconcileVersesForSongUpdate(
    [{ id: "verse-1", lyricText: before }],
    [after],
  );

  expect(plan.matches).toHaveLength(1);
  expect(plan.matches[0]?.oldIndex).toBe(0);
  expect(plan.matches[0]?.newIndex).toBe(0);
  expect(plan.newVerseIndexes).toEqual([]);
  expect(plan.removedVerseIds).toEqual([]);
});

test("reconcileVersesForSongUpdate keeps duplicate exact verses in order", () => {
  const plan = reconcileVersesForSongUpdate(
    [
      { id: "a", lyricText: "Same verse" },
      { id: "b", lyricText: "Same verse" },
    ],
    ["Same verse", "Same verse"],
  );

  expect(plan.matches).toHaveLength(2);
  expect(plan.matches[0]?.oldIndex).toBe(0);
  expect(plan.matches[1]?.oldIndex).toBe(1);
  expect(plan.removedVerseIds).toEqual([]);
  expect(plan.newVerseIndexes).toEqual([]);
});

test("reconcileSongVerses supports add/remove while preserving matched verse identity", async () => {
  const song = await createSongDraft({
    title: "Reconcile mig",
    versesText: "Første vers\n\nAndet vers\n\nTredje vers",
  });

  const firstVerseId = song.verses[0]?.id ?? "";
  const secondVerseId = song.verses[1]?.id ?? "";
  const thirdVerseId = song.verses[2]?.id ?? "";
  expect(firstVerseId).toBeDefined();
  expect(secondVerseId).toBeDefined();
  expect(thirdVerseId).toBeDefined();
  if (!firstVerseId || !secondVerseId || !thirdVerseId) {
    throw new Error("Test setup failed: expected three verses.");
  }

  await withTestPool(async (pool) => {
    await pool.query(
      `
        UPDATE songs
        SET is_published = true
        WHERE id = $1
      `,
      [song.id],
    );

    await pool.query(
      `
        UPDATE song_verses
        SET illustration_url = $2
        WHERE id = $1
      `,
      [firstVerseId, "/images/first.png"],
    );
  });

  const result = await reconcileSongVerses({
    songId: song.id,
    versesText:
      "Første vers rettet\n\nTredje vers\n\nHelt nyt fjerde vers med ny illustration",
  });

  expect(result.matchedVerseCount).toBe(2);
  expect(result.significantMatchedVerseCount).toBe(1);
  expect(result.insertedVerseCount).toBe(1);
  expect(result.removedVerseCount).toBe(1);
  expect(result.wasUnpublished).toBe(true);

  const state = await withTestPool(async (pool) => {
    const result = await pool.query<{
      id: string;
      sequence_number: number;
      lyric_text: string;
      illustration_url: string | null;
    }>(
      `
        SELECT id, sequence_number, lyric_text, illustration_url
        FROM song_verses
        WHERE song_id = $1
        ORDER BY sequence_number
      `,
      [song.id],
    );

    const jobs = await pool.query<{
      verse_id: string;
      status: string;
    }>(
      `
        SELECT verse_id, status
        FROM song_generation_jobs
        WHERE song_id = $1
      `,
      [song.id],
    );

    const songState = await pool.query<{ is_published: boolean }>(
      `
        SELECT is_published
        FROM songs
        WHERE id = $1
      `,
      [song.id],
    );

    return {
      verses: result.rows,
      jobs: jobs.rows,
      isPublished: songState.rows[0]?.is_published ?? null,
    };
  });

  expect(state.verses).toHaveLength(3);
  expect(state.verses[0]?.id).toBe(firstVerseId);
  expect(state.verses[0]?.sequence_number).toBe(1);
  expect(state.verses[0]?.lyric_text).toBe("Første vers rettet");
  expect(state.verses[0]?.illustration_url).toBe("/images/first.png");

  expect(state.verses[1]?.id).toBe(thirdVerseId);
  expect(state.verses[1]?.sequence_number).toBe(2);
  expect(state.verses[1]?.lyric_text).toBe("Tredje vers");

  const newVerseId = state.verses[2]?.id ?? "";
  expect(newVerseId.length).toBeGreaterThan(0);
  expect(newVerseId).not.toBe(firstVerseId);
  expect(newVerseId).not.toBe(secondVerseId);
  expect(newVerseId).not.toBe(thirdVerseId);
  expect(state.verses[2]?.sequence_number).toBe(3);

  const remainingVerseIds = new Set(state.verses.map((verse) => verse.id));
  expect(remainingVerseIds.has(secondVerseId)).toBe(false);
  expect(state.jobs).toHaveLength(3);
  state.jobs.forEach((job) => {
    expect(remainingVerseIds.has(job.verse_id)).toBe(true);
  });
  expect(state.isPublished).toBe(false);
});

test("reconcileSongVerses rejects empty verse text payload", async () => {
  const song = await createSongDraft({
    title: "Validering",
    versesText: "Første vers",
  });

  await expect(
    reconcileSongVerses({
      songId: song.id,
      versesText: "   ",
    }),
  ).rejects.toThrowError(InvalidSongVerseUpdateError);
});

test("reconcileSongVerses unpublishes when changes are significant without adding verses", async () => {
  const song = await createSongDraft({
    title: "Signifikant ændring",
    versesText: "Første vers med mange ord\n\nAndet vers uændret",
  });

  await withTestPool(async (pool) => {
    await pool.query(
      `
        UPDATE songs
        SET is_published = true
        WHERE id = $1
      `,
      [song.id],
    );
  });

  const result = await reconcileSongVerses({
    songId: song.id,
    versesText: "Første tekst med andre ord\n\nAndet vers uændret",
  });

  expect(result.matchedVerseCount).toBe(2);
  expect(result.significantMatchedVerseCount).toBe(1);
  expect(result.insertedVerseCount).toBe(0);
  expect(result.removedVerseCount).toBe(0);
  expect(result.wasUnpublished).toBe(true);

  const songState = await withTestPool(async (pool) => {
    const queryResult = await pool.query<{ is_published: boolean }>(
      `
        SELECT is_published
        FROM songs
        WHERE id = $1
      `,
      [song.id],
    );

    return queryResult.rows[0]?.is_published ?? null;
  });

  expect(songState).toBe(false);
});
