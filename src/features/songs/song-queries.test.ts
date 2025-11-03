import { expect, test } from "vitest";
import {
  fetchPublishedSongs,
  findSongBySlug,
} from "@/features/songs/song-queries";
import { registerDatabaseTestSuite } from "@/features/testing/database-test-harness";
import { withTestPool } from "@/features/testing/postgres-test-utils";

const SONG_TABLES: readonly string[] = [
  "song_tags",
  "song_verses",
  "songs",
  "tags",
];

registerDatabaseTestSuite({ truncateTables: SONG_TABLES });

const seedSongData = async () => {
  await withTestPool(async (pool) => {
    await pool.query(
      `
        INSERT INTO tag_categories (slug, label)
        VALUES
          ('stemninger', 'Stemninger'),
          ('figurer', 'Figurer'),
          ('temaer', 'Temaer')
        ON CONFLICT (slug) DO NOTHING;
      `,
    );

    await pool.query(
      `
        INSERT INTO tags (name, display_name, category_slug)
        VALUES
          ('humoristisk', 'Humoristisk', 'stemninger'),
          ('dyr', 'Dyr', 'figurer'),
          ('rim', 'Rim', 'temaer')
        ON CONFLICT (name) DO NOTHING;
      `,
    );

    await pool.query(
      `
        INSERT INTO songs (id, slug, title, language_code, is_published)
        VALUES
          ('00000000-0000-0000-0000-000000000001', 'jeg-har-fanget-mig-en-myg', 'Jeg har fanget mig en myg', 'da', true),
          ('00000000-0000-0000-0000-000000000002', 'uoffentlig-sang', 'Uoffentlig sang', 'da', false);
      `,
    );

    await pool.query(
      `
        INSERT INTO song_tags (id, song_id, tag_name)
        VALUES
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'humoristisk'),
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'dyr'),
          (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'rim');
      `,
    );

    await pool.query(
      `
        INSERT INTO song_verses (id, song_id, sequence_number, lyric_text, illustration_url)
        VALUES
          ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 1, 'Vers 1 tekst', '/jeg-har-fanget-mig-en-myg-01.png'),
          ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 2, 'Vers 2 tekst', '/jeg-har-fanget-mig-en-myg-02.png');
      `,
    );
  });
};

test("fetchPublishedSongs returns only published songs with sorted tags", async () => {
  await seedSongData();

  const songs = await fetchPublishedSongs();

  expect(songs).toHaveLength(1);
  const [song] = songs;

  expect(song?.slug).toBe("jeg-har-fanget-mig-en-myg");
  expect(song?.title).toBe("Jeg har fanget mig en myg");
  expect(song?.tags).toEqual(["dyr", "humoristisk"]);
  expect(song?.coverImageUrl).toBe("/jeg-har-fanget-mig-en-myg-01.png");
});

test("findSongBySlug returns full song with verses ordered by sequence", async () => {
  await seedSongData();

  const song = await findSongBySlug("Jeg-HAR-FANGET-mig-en-myg");

  expect(song).not.toBeNull();
  if (!song) {
    return;
  }

  expect(song.slug).toBe("jeg-har-fanget-mig-en-myg");
  expect(song.isPublished).toBe(true);
  expect(song.coverImageUrl).toBe("/jeg-har-fanget-mig-en-myg-01.png");
  expect(song.tags).toEqual(["dyr", "humoristisk"]);
  expect(song.verses).toHaveLength(2);
  expect(song.verses[0]?.sequenceNumber).toBe(1);
  expect(song.verses[0]?.illustrationUrl).toBe(
    "/jeg-har-fanget-mig-en-myg-01.png",
  );
  expect(song.verses[1]?.sequenceNumber).toBe(2);
});

test("findSongBySlug returns null when song does not exist", async () => {
  const song = await findSongBySlug("non-existent");

  expect(song).toBeNull();
});
