import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
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
const OPENROUTER_DEFAULT_MODEL = "stabilityai/stable-diffusion-3.5-large";
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
      return null;
    }

    const { job, song, verse } = claim;
    const model =
      process.env.OPENROUTER_MODEL?.trim() ?? OPENROUTER_DEFAULT_MODEL;
    const client = createOpenRouterClient();

    const existingConversation = await findConversationForSong(job.songId);

    const conversationId = existingConversation?.conversationId ?? randomUUID();
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

      const imageBuffer = await generateIllustrationBuffer(
        client,
        model,
        prompt,
      );

      const updatedVerse = await saveVerseIllustration({
        songId: song.id,
        verseId: verse.id,
        imageData: bufferToArrayBuffer(imageBuffer),
      });

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

      return {
        jobId: job.id,
        songId: song.id,
        verseSequence: updatedVerse.sequenceNumber,
        conversationId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markSongGenerationJobFailed(job.id, message);
      throw error;
    }
  };
