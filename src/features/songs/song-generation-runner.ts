import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import type { ResponseOutputItem } from "openai/resources/responses/responses";
import { getRequiredConfigValue } from "@/config";
import {
  findConversationForSong,
  upsertConversationForSong,
} from "@/features/songs/song-generation-conversations";
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
import { saveVerseIllustration } from "@/features/songs/verse-illustration-service";

const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MODEL = "openai/gpt-5-image-mini";
const PROVIDER = "openrouter";

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(buffer);
  return arrayBuffer;
};

const createOpenRouterClient = (conversationId?: string): OpenAI =>
  new OpenAI({
    apiKey: getRequiredConfigValue("OPENROUTER_API_KEY"),
    baseURL:
      process.env.OPENROUTER_BASE_URL?.trim() ?? OPENROUTER_DEFAULT_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.OPENROUTER_HTTP_REFERER?.trim() ?? "https://illusongs.app",
      "X-Title":
        process.env.OPENROUTER_APP_TITLE?.trim() ?? "Illusongs Song Generator",
      ...(conversationId ? { "X-Conversation-ID": conversationId } : {}),
    },
  });

const extractImageCall = (
  output: ReadonlyArray<ResponseOutputItem>,
): ResponseOutputItem.ImageGenerationCall | null => {
  for (const item of output) {
    if (item.type === "image_generation_call") {
      return item;
    }
  }
  return null;
};

const decodeBase64Image = (value: string): Buffer => {
  const normalized = value.includes(",")
    ? value.slice(value.lastIndexOf(",") + 1)
    : value;
  return Buffer.from(normalized, "base64");
};

const generateIllustrationBuffer = async (
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<Buffer> => {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        type: "message",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const imageCall = extractImageCall(response.output);
  if (!imageCall) {
    throw new Error("Image generation response did not include image data.");
  }

  if (imageCall.status !== "completed" || !imageCall.result) {
    throw new Error("Image generation did not complete successfully.");
  }

  return decodeBase64Image(imageCall.result);
};

export type SongGenerationRunResult = {
  jobId: string;
  songId: string;
  verseSequence: number;
  conversationId: string;
};

export const processNextSongGenerationJob =
  async (): Promise<SongGenerationRunResult | null> => {
    const claim = await claimNextSongGenerationJob();

    if (!claim) {
      console.info(
        JSON.stringify({
          event: "song_generation_job_none_available",
          provider: PROVIDER,
        }),
      );
      return null;
    }

    const { job, song, verse } = claim;
    const model =
      process.env.OPENROUTER_MODEL?.trim() ?? OPENROUTER_DEFAULT_MODEL;
    const existingConversation = await findConversationForSong(job.songId);

    const conversationId = existingConversation?.conversationId ?? randomUUID();
    const client = createOpenRouterClient(conversationId);
    console.info(
      JSON.stringify({
        event: "song_generation_job_claimed",
        jobId: job.id,
        songId: job.songId,
        verseId: verse.id,
        verseSequence: verse.sequenceNumber,
        attempts: job.attempts,
        provider: PROVIDER,
        model,
        hasExistingConversation: Boolean(existingConversation),
      }),
    );
    if (
      !existingConversation ||
      existingConversation.model !== model ||
      existingConversation.provider !== PROVIDER
    ) {
      await upsertConversationForSong({
        songId: job.songId,
        provider: PROVIDER,
        model,
        conversationId,
      });
    }

    try {
      const prompt =
        verse.sequenceNumber === 1
          ? createInitialSongIllustrationPrompt(song)
          : createNextVerseIllustrationPrompt(verse);

      console.info(
        JSON.stringify({
          event: "song_generation_prompt_created",
          jobId: job.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
          promptLength: prompt.length,
        }),
      );

      const imageBuffer = await generateIllustrationBuffer(
        client,
        model,
        prompt,
      );

      console.info(
        JSON.stringify({
          event: "song_generation_image_generated",
          jobId: job.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
        }),
      );

      const updatedVerse = await saveVerseIllustration({
        songId: song.id,
        verseId: verse.id,
        imageData: bufferToArrayBuffer(imageBuffer),
      });

      console.info(
        JSON.stringify({
          event: "song_generation_verse_updated",
          jobId: job.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
          illustrationUrl: updatedVerse.illustrationUrl,
        }),
      );

      await recordSongGenerationVerseArtifact({
        jobId: job.id,
        verseId: verse.id,
        prompt,
        provider: PROVIDER,
        model,
        imageUrl: updatedVerse.illustrationUrl,
        imagePath: null,
      });

      await markSongGenerationJobCompleted(job.id);

      console.info(
        JSON.stringify({
          event: "song_generation_job_completed",
          jobId: job.id,
          songId: song.id,
          verseId: verse.id,
          verseSequence: updatedVerse.sequenceNumber,
          conversationId,
        }),
      );

      return {
        jobId: job.id,
        songId: song.id,
        verseSequence: updatedVerse.sequenceNumber,
        conversationId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          event: "song_generation_job_failed",
          jobId: job.id,
          songId: song.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
          error: message,
        }),
      );
      await markSongGenerationJobFailed(job.id, message);
      throw error;
    }
  };
