import { expect, test } from "vitest";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { fetchAdminSongSummaries } from "@/features/songs/song-admin-queries";
import { createSong } from "@/features/songs/song-commands";
import {
  enqueueSongGenerationJobs,
  markSongGenerationJobCompleted,
} from "@/features/songs/song-generation-queue";
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

test("fetchAdminSongSummaries returns songs with job counts", async () => {
  const song = await createSong({
    slug: "admin-song",
    title: "Admin Song",
    languageCode: "da",
    isPublished: false,
    tags: [],
    verses: [
      {
        sequenceNumber: 1,
        lyricText: "Vers 1",
        illustrationUrl: null,
      },
      {
        sequenceNumber: 2,
        lyricText: "Vers 2",
        illustrationUrl: null,
      },
    ],
  });

  const connection = getPostgresConnection();
  await connection.clientUsing(async (client) => {
    await enqueueSongGenerationJobs(
      client,
      song.id,
      song.verses.map((verse) => ({
        id: verse.id,
        sequenceNumber: verse.sequenceNumber,
      })),
    );
  });

  const summaries = await fetchAdminSongSummaries();
  const summary = summaries.find((entry) => entry.id === song.id);

  expect(summary).toBeDefined();
  expect(summary?.verseCount).toBe(2);
  expect(summary?.pendingJobs).toBe(2);

  // mark one job complete to ensure pending count changes
  const jobId = await withTestPool(async (pool) => {
    const result = await pool.query<{ id: string }>(
      `
        SELECT id
        FROM song_generation_jobs
        WHERE song_id = $1
        ORDER BY verse_id
        LIMIT 1
      `,
      [song.id],
    );
    return result.rows[0]?.id ?? null;
  });

  expect(jobId).not.toBeNull();
  if (jobId) {
    await markSongGenerationJobCompleted(jobId);
  }

  const updatedSummaries = await fetchAdminSongSummaries();
  const updated = updatedSummaries.find((entry) => entry.id === song.id);
  expect(updated?.pendingJobs).toBe(1);
});
