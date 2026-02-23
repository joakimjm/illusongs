import { expect, test } from "vitest";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { createSongWithClient } from "@/features/songs/song-commands";
import {
  claimNextSongGenerationJob,
  enqueueSongGenerationJobs,
  fetchSongGenerationJobList,
  findSongGenerationPromptPreviewByJobId,
  markSongGenerationJobCompleted,
  markSongGenerationJobFailed,
  recordSongGenerationVerseArtifact,
  resetSongGenerationJob,
} from "@/features/songs/song-generation-queue";
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

const seedSongWithJobs = async (verseCount: number) => {
  const connection = getPostgresConnection();

  const song = await connection.clientUsing(async (client) => {
    const verses = Array.from({ length: verseCount }).map((_, index) => ({
      sequenceNumber: index + 1,
      lyricText: `Vers ${index + 1}`,
      illustrationUrl: null,
    }));

    const created = await createSongWithClient(client, {
      slug: "test-song",
      title: "Test Song",
      languageCode: "da",
      isPublished: false,
      tags: [],
      verses,
    });

    await enqueueSongGenerationJobs(
      client,
      created.id,
      created.verses.map((verse) => ({
        id: verse.id,
        sequenceNumber: verse.sequenceNumber,
      })),
    );
    return created;
  });

  return song;
};

const seedCustomSongWithJobs = async (options: {
  slug: string;
  title: string;
  isPublished: boolean;
  verses: string[];
}) => {
  const connection = getPostgresConnection();

  const song = await connection.clientUsing(async (client) => {
    const created = await createSongWithClient(client, {
      slug: options.slug,
      title: options.title,
      languageCode: "da",
      isPublished: options.isPublished,
      tags: [],
      verses: options.verses.map((lyricText, index) => ({
        sequenceNumber: index + 1,
        lyricText,
        illustrationUrl: null,
      })),
    });

    await enqueueSongGenerationJobs(
      client,
      created.id,
      created.verses.map((verse) => ({
        id: verse.id,
        sequenceNumber: verse.sequenceNumber,
      })),
    );

    return created;
  });

  return song;
};

test("claimNextSongGenerationJob returns next pending job with song detail", async () => {
  const song = await seedSongWithJobs(1);

  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  expect(claim?.job.status).toBe("in_progress");
  expect(claim?.job.attempts).toBe(1);
  expect(claim?.job.additionalPromptDirection).toBeNull();
  expect(claim?.song.id).toBe(song.id);
  expect(claim?.song.verses).toHaveLength(1);
  expect(claim?.verse.id).toBe(song.verses[0]?.id);

  const jobStatus = await withTestPool(async (pool) => {
    const result = await pool.query<{ status: string }>(
      `SELECT status FROM song_generation_jobs WHERE song_id = $1`,
      [song.id],
    );
    return result.rows[0]?.status ?? null;
  });

  expect(jobStatus).toBe("in_progress");
});

test("claimNextSongGenerationJob returns null when no pending jobs", async () => {
  const claim = await claimNextSongGenerationJob();
  expect(claim).toBeNull();
});

test("markSongGenerationJobCompleted sets job status to completed", async () => {
  await seedSongWithJobs(1);
  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  const jobId = claim?.job.id ?? "";

  await markSongGenerationJobCompleted(jobId);

  const jobStatus = await withTestPool(async (pool) => {
    const result = await pool.query<{ status: string }>(
      `SELECT status FROM song_generation_jobs WHERE id = $1`,
      [jobId],
    );
    return result.rows[0]?.status ?? null;
  });

  expect(jobStatus).toBe("completed");
});

test("markSongGenerationJobFailed records failure detail", async () => {
  await seedSongWithJobs(1);
  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  const jobId = claim?.job.id ?? "";

  await markSongGenerationJobFailed(jobId, "Illustration failed");

  const jobRow = await withTestPool(async (pool) => {
    const result = await pool.query<{
      status: string;
      last_error: string | null;
    }>(`SELECT status, last_error FROM song_generation_jobs WHERE id = $1`, [
      jobId,
    ]);
    return result.rows[0] ?? null;
  });

  expect(jobRow?.status).toBe("failed");
  expect(jobRow?.last_error).toBe("Illustration failed");
});

test("recordSongGenerationVerseArtifact upserts metadata", async () => {
  await seedSongWithJobs(1);
  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  const jobId = claim?.job.id ?? "";
  const verse = claim?.song.verses[0];
  expect(verse).toBeDefined();

  const firstRecord = await recordSongGenerationVerseArtifact({
    jobId,
    verseId: verse?.id ?? "",
    prompt: "Prompt 1",
    provider: "openrouter",
    model: "model-1",
    imageUrl: "https://example.com/image1.webp",
    imagePath: "path-1",
    thumbnailPath: "thumb-1",
    imageSummary: "Summary 1",
  });

  expect(firstRecord.prompt).toBe("Prompt 1");
  expect(firstRecord.thumbnail_path).toBe("thumb-1");
  expect(firstRecord.image_summary).toBe("Summary 1");

  const secondRecord = await recordSongGenerationVerseArtifact({
    jobId,
    verseId: verse?.id ?? "",
    prompt: "Prompt 2",
    provider: "openrouter",
    model: "model-2",
    imageUrl: "https://example.com/image2.webp",
    imagePath: "path-2",
    thumbnailPath: "thumb-2",
    imageSummary: "Summary 2",
  });

  expect(secondRecord.prompt).toBe("Prompt 2");
  expect(secondRecord.model).toBe("model-2");
  expect(secondRecord.thumbnail_path).toBe("thumb-2");
  expect(secondRecord.image_summary).toBe("Summary 2");
});

test("enqueueSongGenerationJobs creates one job per verse", async () => {
  const song = await seedSongWithJobs(3);

  const jobCount = await withTestPool(async (pool) => {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM song_generation_jobs WHERE song_id = $1`,
      [song.id],
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  });

  expect(jobCount).toBe(3);
});

test("fetchSongGenerationJobList returns enriched entries", async () => {
  const song = await seedSongWithJobs(2);
  const jobs = await fetchSongGenerationJobList(5);

  expect(jobs.length).toBeGreaterThanOrEqual(2);
  const first = jobs.find((entry) => entry.songId === song.id);
  expect(first).toBeDefined();
  expect(first?.songTitle).toBe("Test Song");
  expect(first?.verseSequence).toBeGreaterThanOrEqual(1);
  expect(first?.isPublished).toBe(false);
});

test("fetchSongGenerationJobList supports filtering published and search text", async () => {
  const draft = await seedCustomSongWithJobs({
    slug: "draft-song-filter",
    title: "Draft Song Filter",
    isPublished: false,
    verses: ["Moonlit chorus", "Silver rivers"],
  });
  const published = await seedCustomSongWithJobs({
    slug: "published-song-filter",
    title: "Bright Horizon",
    isPublished: true,
    verses: ["Shining sun over the bay"],
  });

  const allJobs = await fetchSongGenerationJobList({ limit: 10 });
  expect(allJobs.some((job) => job.songId === published.id)).toBe(true);

  const hiddenPublished = await fetchSongGenerationJobList({
    excludePublished: true,
    limit: 10,
  });
  expect(hiddenPublished.some((job) => job.songId === published.id)).toBe(
    false,
  );
  expect(hiddenPublished.some((job) => job.songId === draft.id)).toBe(true);

  const searchDraft = await fetchSongGenerationJobList({
    searchText: "moonlit",
    limit: 10,
  });
  expect(searchDraft.some((job) => job.songId === draft.id)).toBe(true);
  const searchPublished = await fetchSongGenerationJobList({
    searchText: "shining",
    excludePublished: true,
    limit: 10,
  });
  expect(searchPublished.some((job) => job.songId === published.id)).toBe(
    false,
  );
});

test("resetSongGenerationJob clears illustration and requeues job", async () => {
  const song = await seedSongWithJobs(1);
  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  const job = claim?.job;
  const verse = claim?.verse;
  expect(job).toBeDefined();
  expect(verse).toBeDefined();

  await markSongGenerationJobCompleted(job?.id ?? "");

  await withTestPool(async (pool) => {
    await pool.query(
      `
        UPDATE song_verses
        SET illustration_url = $1
        WHERE id = $2
      `,
      ["https://example.com/previous.webp", verse?.id ?? ""],
    );

    await pool.query(
      `
        INSERT INTO song_generation_verse_artifacts (
          job_id,
          verse_id,
          prompt,
          provider,
          model,
          image_url,
          image_path,
          thumbnail_path,
          image_summary
        )
        VALUES ($1, $2, 'Prompt', 'openrouter', 'model', $3, $4, $5, $6)
      `,
      [
        job?.id ?? "",
        verse?.id ?? "",
        "https://example.com/previous.webp",
        "old-path",
        "old-thumb",
        "Previous summary",
      ],
    );
  });

  const reset = await resetSongGenerationJob(job?.id ?? "");
  expect(reset).not.toBeNull();
  expect(reset?.jobId).toBe(job?.id);
  expect(reset?.songId).toBe(song.id);
  expect(reset?.verseId).toBe(verse?.id);
  expect(reset?.imagePath).toBe("old-path");
  expect(reset?.thumbnailPath).toBe("old-thumb");

  const status = await withTestPool(async (pool) => {
    const result = await pool.query<{ status: string }>(
      `SELECT status FROM song_generation_jobs WHERE id = $1`,
      [job?.id ?? ""],
    );
    return result.rows[0]?.status ?? null;
  });

  expect(status).toBe("pending");

  const verseRow = await withTestPool(async (pool) => {
    const result = await pool.query<{ illustration_url: string | null }>(
      `SELECT illustration_url FROM song_verses WHERE id = $1`,
      [verse?.id ?? ""],
    );
    return result.rows[0]?.illustration_url ?? null;
  });

  expect(verseRow).toBeNull();

  const artifactCount = await withTestPool(async (pool) => {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM song_generation_verse_artifacts WHERE verse_id = $1`,
      [verse?.id ?? ""],
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  });

  expect(artifactCount).toBe(0);
});

test("resetSongGenerationJob updates additional prompt direction when provided", async () => {
  await seedSongWithJobs(1);
  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  const jobId = claim?.job.id ?? "";

  await resetSongGenerationJob(jobId, "No text in image.");

  const direction = await withTestPool(async (pool) => {
    const result = await pool.query<{
      additional_prompt_direction: string | null;
    }>(
      `
        SELECT additional_prompt_direction
        FROM song_generation_jobs
        WHERE id = $1
      `,
      [jobId],
    );

    return result.rows[0]?.additional_prompt_direction ?? null;
  });

  expect(direction).toBe("No text in image.");
});

test("findSongGenerationPromptPreviewByJobId returns base and full prompt", async () => {
  await seedSongWithJobs(1);
  const claim = await claimNextSongGenerationJob();
  expect(claim).not.toBeNull();
  const jobId = claim?.job.id ?? "";

  await resetSongGenerationJob(jobId, "No text in image.");
  const preview = await findSongGenerationPromptPreviewByJobId(jobId);

  expect(preview).not.toBeNull();
  expect(preview?.additionalPromptDirection).toBe("No text in image.");
  expect(preview?.basePrompt).toContain("Lav en illustration af første vers:");
  expect(preview?.fullPrompt).toContain("Ekstra retning for dette vers:");
});
