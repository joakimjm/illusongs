import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SONGS_MANAGED_BY_ADMINS_DETAIL } from "@/app/api/songs/songs.constants";
import { getRequiredConfigValue } from "@/config";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createForbiddenResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import {
  createInitialSongIllustrationPrompt,
  createNextVerseIllustrationPrompt,
} from "@/features/songs/song-generation-prompts";
import {
  claimNextSongGenerationJob,
  markSongGenerationJobCompleted,
  markSongGenerationJobFailed,
  recordSongGenerationVerseArtifact,
} from "@/features/songs/song-generation-queue";
import type { SongVerseDto } from "@/features/songs/song-types";
import { saveVerseIllustration } from "@/features/songs/verse-illustration-service";

export const runtime = "nodejs";

const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MODEL = "google/gemini-2.5-flash-image";

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(buffer);
  return arrayBuffer;
};

const createOpenRouterClient = (): OpenAI =>
  new OpenAI({
    apiKey: getRequiredConfigValue("OPENROUTER_API_KEY"),
    baseURL:
      process.env.OPENROUTER_BASE_URL?.trim() ?? OPENROUTER_DEFAULT_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.OPENROUTER_HTTP_REFERER?.trim() ?? "https://illusongs.app",
      "X-Title":
        process.env.OPENROUTER_APP_TITLE?.trim() ?? "Illusongs Song Generator",
    },
  });

const generateIllustrationBuffer = async (
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<Buffer> => {
  const response = await client.images.generate({
    model,
    prompt,
    size: "1024x1536",
  });

  const result = response.data?.at(0);

  if (!result || !result.b64_json) {
    throw new Error("Image generation response missing image data.");
  }

  return Buffer.from(result.b64_json, "base64");
};

type SongGenerationResult = {
  jobId: string;
  songId: string;
  verse: SongVerseDto;
};

const processJob = async (
  client: OpenAI,
): Promise<SongGenerationResult | null> => {
  const claim = await claimNextSongGenerationJob();

  if (!claim) {
    return null;
  }

  const { job, song, verse } = claim;
  const model =
    process.env.OPENROUTER_MODEL?.trim() ?? OPENROUTER_DEFAULT_MODEL;

  try {
    const prompt =
      verse.sequenceNumber === 1
        ? createInitialSongIllustrationPrompt(song)
        : createNextVerseIllustrationPrompt(verse);

    const imageBuffer = await generateIllustrationBuffer(client, model, prompt);
    const updatedVerse = await saveVerseIllustration({
      songId: song.id,
      verseId: verse.id,
      imageData: bufferToArrayBuffer(imageBuffer),
    });

    await recordSongGenerationVerseArtifact({
      jobId: job.id,
      verseId: verse.id,
      prompt,
      provider: "openrouter",
      model,
      imageUrl: updatedVerse.illustrationUrl,
      imagePath: null,
    });

    await markSongGenerationJobCompleted(job.id);

    return {
      jobId: job.id,
      songId: song.id,
      verse: updatedVerse,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markSongGenerationJobFailed(job.id, message);
    throw error;
  }
};

const handlers = createApiRoute({
  POST: async ({ identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(SONGS_MANAGED_BY_ADMINS_DETAIL);
    }

    try {
      const client = createOpenRouterClient();
      const result = await processJob(client);

      if (!result) {
        return new Response(null, { status: 204 });
      }

      return NextResponse.json(result);
    } catch (error) {
      return logAndRespondWithError(
        "song_generation_dispatch_failed",
        error,
        "Unable to process song generation job",
      );
    }
  },
});

export const POST = handlers.POST;
