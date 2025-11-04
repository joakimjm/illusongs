import { expect, test } from "vitest";
import {
  createSong,
  updateSongPublishStatus,
} from "@/features/songs/song-commands";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";
import { withTestPool } from "@/features/testing/postgres-test-utils";

const SONG_TABLES: readonly string[] = [
  "song_tags",
  "song_verses",
  "songs",
  "tags",
];

registerDatabaseTestSuite({ truncateTables: SONG_TABLES });

const getSongCount = async (): Promise<number> =>
  await withTestPool(async (pool) => {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM songs`,
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  });

test("createSong inserts song, verses, and tags", async () => {
  const song = await createSong({
    slug: "jeg-har-fanget-mig-en-myg",
    title: "Jeg har fanget mig en myg",
    languageCode: "da",
    isPublished: true,
    tags: ["dyr", "Humoristisk", "dyr"],
    verses: [
      {
        sequenceNumber: 2,
        lyricText: "Vers 2 tekst",
        illustrationUrl: "/song-02.png",
      },
      {
        sequenceNumber: 1,
        lyricText: "Vers 1 tekst",
        illustrationUrl: "/song-01.png",
      },
    ],
  });

  expect(song.slug).toBe("jeg-har-fanget-mig-en-myg");
  expect(song.tags).toEqual(["dyr", "humoristisk"]);
  expect(song.coverImageUrl).toBe("/song-01.png");
  expect(song.verses).toHaveLength(2);
  expect(song.verses[0]?.sequenceNumber).toBe(1);
  expect(song.verses[1]?.sequenceNumber).toBe(2);

  const count = await getSongCount();
  expect(count).toBe(1);
});

test("createSong is idempotent on tags table", async () => {
  await createSong({
    slug: "gentagelse",
    title: "Gentagelse",
    languageCode: "da",
    isPublished: false,
    tags: ["gentagelse", "Gentagelse"],
    verses: [
      {
        sequenceNumber: 1,
        lyricText: "Tekst",
        illustrationUrl: null,
      },
    ],
  });

  const song = await createSong({
    slug: "gentagelse-2",
    title: "Gentagelse 2",
    languageCode: "da",
    isPublished: false,
    tags: ["gentagelse", "Gentagelse"],
    verses: [
      {
        sequenceNumber: 1,
        lyricText: "Tekst",
        illustrationUrl: null,
      },
    ],
  });

  expect(song.coverImageUrl).toBeNull();

  const tags = await withTestPool(async (pool) => {
    const result = await pool.query<{ name: string }>(
      `SELECT name FROM tags ORDER BY name`,
    );
    return result.rows.map((row) => row.name);
  });

  expect(tags).toEqual(["gentagelse"]);
});

test("updateSongPublishStatus toggles publish state", async () => {
  const song = await createSong({
    slug: "updater",
    title: "Updater",
    languageCode: "da",
    isPublished: false,
    tags: [],
    verses: [
      {
        sequenceNumber: 1,
        lyricText: "Vers",
        illustrationUrl: null,
      },
    ],
  });

  const published = await updateSongPublishStatus(song.id, true);
  expect(published).toBe(true);

  const row = await withTestPool(async (pool) => {
    const result = await pool.query<{ is_published: boolean }>(
      `SELECT is_published FROM songs WHERE id = $1`,
      [song.id],
    );
    return result.rows[0] ?? null;
  });

  expect(row?.is_published).toBe(true);

  const unpublished = await updateSongPublishStatus(song.id, false);
  expect(unpublished).toBe(true);

  const row2 = await withTestPool(async (pool) => {
    const result = await pool.query<{ is_published: boolean }>(
      `SELECT is_published FROM songs WHERE id = $1`,
      [song.id],
    );
    return result.rows[0] ?? null;
  });

  expect(row2?.is_published).toBe(false);
});
