import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createForbiddenResponse,
  createNotFoundResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { resetSongGenerationJob } from "@/features/songs/song-generation-queue";
import type { ResetSongGenerationJobResult } from "@/features/songs/song-generation-queue";
import { deleteVerseIllustrationImage } from "@/features/songs/verse-illustration-storage";
import { isValidUuid } from "@/utils";

export const runtime = "nodejs";

const normalizeUuid = (value: string | undefined): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Invalid id");
  }
  const normalized = value.trim().toLowerCase();
  if (!isValidUuid(normalized)) {
    throw new Error("Invalid id");
  }
  return normalized;
};

const findLatestJobForVerse = async (
  songId: string,
  verseId: string,
): Promise<{ jobId: string; slug: string } | null> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<{
      job_id: string;
      slug: string;
      is_published: boolean;
    }>(
      `
        SELECT
          j.id AS job_id,
          s.slug AS slug,
          s.is_published AS is_published
        FROM song_generation_jobs j
        JOIN songs s ON s.id = j.song_id
        WHERE j.song_id = $1 AND j.verse_id = $2
        ORDER BY j.created_at DESC
        LIMIT 1
      `,
      [songId, verseId],
    );

    const row = result.rows[0];
    if (!row || row.is_published) {
      return null;
    }

    return { jobId: row.job_id, slug: row.slug };
  });
};

const deleteExistingImages = async (
  resetResult: ResetSongGenerationJobResult,
): Promise<void> => {
  const deletions: Array<Promise<void>> = [];
  if (resetResult.imagePath) {
    deletions.push(deleteVerseIllustrationImage(resetResult.imagePath));
  }
  if (resetResult.thumbnailPath) {
    deletions.push(deleteVerseIllustrationImage(resetResult.thumbnailPath));
  }

  await Promise.allSettled(deletions);
};

const handlers = createApiRoute<{ songId: string; verseId: string }>({
  POST: async ({ params, identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse("Admins only.");
    }

    try {
      const songId = normalizeUuid(params.songId);
      const verseId = normalizeUuid(params.verseId);

      const job = await findLatestJobForVerse(songId, verseId);
      if (!job) {
        return createNotFoundResponse("No job found for this verse.");
      }

      const resetResult = await resetSongGenerationJob(job.jobId);
      if (!resetResult) {
        return createNotFoundResponse("Unable to reset job for verse.");
      }

      await deleteExistingImages(resetResult);
      revalidatePath("/admin/jobs");
      revalidatePath(`/songs/${job.slug}`);

      return NextResponse.json({
        status: "queued",
        jobId: resetResult.jobId,
        verseId: resetResult.verseId,
      });
    } catch (error) {
      return logAndRespondWithError(
        "song_generation_requeue_failed",
        error,
        "Unable to requeue illustration",
      );
    }
  },
});

export const POST = handlers.POST;
