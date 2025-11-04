import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import type {
  Response,
  ResponseInputItem,
  ResponseOutputItem,
} from "openai/resources/responses/responses";
import { getRequiredConfigValue } from "@/config";
import {
  findConversationForSong,
  upsertConversationForSong,
} from "@/features/songs/song-generation-conversations";
import {
  ART_STYLE_BLOCK,
  createInitialSongIllustrationPrompt,
  createNextVerseIllustrationPrompt,
} from "@/features/songs/song-generation-prompts";
import {
  claimNextSongGenerationJob,
  markSongGenerationJobCompleted,
  markSongGenerationJobFailed,
  recordSongGenerationVerseArtifact,
} from "@/features/songs/song-generation-queue";
import {
  fetchSongGenerationVerseArtifactsBySong,
  type SongGenerationVerseArtifactDto,
} from "@/features/songs/song-generation-verse-artifacts";
import type { SongDetailDto, SongVerseDto } from "@/features/songs/song-types";
import { saveVerseIllustration } from "@/features/songs/verse-illustration-service";
import { getVerseIllustrationPublicUrl } from "@/features/songs/verse-illustration-storage";

const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MODEL = "openai/gpt-5-image-mini";
const PROVIDER = "openrouter";
const IMAGE_POLL_INTERVAL_MS = 1500;
const IMAGE_POLL_MAX_ATTEMPTS = 10;

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

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const resolveImageFromResponse = async (
  client: OpenAI,
  response: Response,
): Promise<{ buffer: Buffer; response: Response }> => {
  let attempt = 0;
  let current = response;

  while (attempt <= IMAGE_POLL_MAX_ATTEMPTS) {
    const imageCall = extractImageCall(current.output);

    if (!imageCall) {
      throw new Error(
        `Image generation response missing image data (responseId=${current.id}).`,
      );
    }

    if (imageCall.status === "completed" && imageCall.result) {
      return { buffer: decodeBase64Image(imageCall.result), response: current };
    }

    if (imageCall.status === "failed") {
      throw new Error(`Image generation failed for response ${current.id}.`);
    }

    attempt += 1;
    if (attempt > IMAGE_POLL_MAX_ATTEMPTS) {
      break;
    }

    await wait(IMAGE_POLL_INTERVAL_MS);
    current = await client.responses.retrieve(current.id);
  }

  throw new Error(
    `Image generation timed out before completion (responseId=${response.id}).`,
  );
};

const createTextContent = (text: string) => ({
  type: "input_text" as const,
  text,
});

const createImageContent = (imageUrl: string) => ({
  type: "input_image" as const,
  image_url: imageUrl,
  detail: "low" as const,
});

const createMessage = (
  role: "system" | "user" | "assistant",
  content: Array<
    ReturnType<typeof createTextContent> | ReturnType<typeof createImageContent>
  >,
): ResponseInputItem => ({
  type: "message",
  role,
  content,
});

const buildImageGenerationMessages = (
  song: SongDetailDto,
  currentVerse: SongVerseDto,
  artifactsByVerseId: Map<string, SongGenerationVerseArtifactDto>,
  finalPromptText: string,
): ResponseInputItem[] => {
  const styleMessage = createTextContent(
    [
      "Maintain the following illustration style consistently across all verses:",
      "",
      ART_STYLE_BLOCK,
      "",
      "Preserve character continuity, mood, and palette across every verse.",
    ].join("\n"),
  );

  const messages: ResponseInputItem[] = [
    createMessage("system", [styleMessage]),
  ];

  const previousVerses = song.verses
    .filter((entry) => entry.sequenceNumber < currentVerse.sequenceNumber)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (const verse of previousVerses) {
    messages.push(
      createMessage("user", [
        createTextContent(
          `Verse ${verse.sequenceNumber}:\n${verse.lyricText.trim()}`,
        ),
      ]),
    );

    const artifact = artifactsByVerseId.get(verse.id);
    if (!artifact) {
      continue;
    }

    const summaryText = artifact.imageSummary?.trim().length
      ? artifact.imageSummary.trim()
      : `Illustration generated for verse ${verse.sequenceNumber}. Maintain visual continuity with this scene.`;

    const assistantContent: Array<
      | ReturnType<typeof createTextContent>
      | ReturnType<typeof createImageContent>
    > = [createTextContent(summaryText)];

    const thumbnailUrl = getVerseIllustrationPublicUrl(artifact.thumbnailPath);
    if (thumbnailUrl) {
      assistantContent.push(createImageContent(thumbnailUrl));
    }

    messages.push(createMessage("assistant", assistantContent));
  }

  messages.push(createMessage("user", [createTextContent(finalPromptText)]));

  return messages;
};

const generateIllustrationBuffer = async (
  client: OpenAI,
  model: string,
  input: ResponseInputItem[],
): Promise<{ buffer: Buffer; response: Response }> => {
  const response = await client.responses.create({
    model,
    input,
  });

  return await resolveImageFromResponse(client, response);
};

export type SongGenerationRunResult = {
  jobId: string;
  songId: string;
  verseSequence: number;
  conversationId: string;
  responseId: string;
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
    const jobStartedAt = Date.now();
    let generationStartedAt: number | null = null;
    let generationDurationMs: number | null = null;
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

    let responseId: string | null = null;

    try {
      console.info(
        JSON.stringify({
          event: "song_generation_conversation_ready",
          jobId: job.id,
          songId: song.id,
          conversationId,
        }),
      );

      const artifacts = await fetchSongGenerationVerseArtifactsBySong(song.id);
      const artifactsByVerseId = new Map(
        artifacts.map((artifact) => [artifact.verseId, artifact]),
      );

      const prompt =
        verse.sequenceNumber === 1
          ? createInitialSongIllustrationPrompt(song)
          : createNextVerseIllustrationPrompt(verse);

      const previousVerses = song.verses
        .filter((entry) => entry.sequenceNumber < verse.sequenceNumber)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      const referencedArtifacts = previousVerses.filter((entry) =>
        artifactsByVerseId.has(entry.id),
      ).length;

      const messages = buildImageGenerationMessages(
        song,
        verse,
        artifactsByVerseId,
        prompt,
      );

      console.info(
        JSON.stringify({
          event: "song_generation_prompt_created",
          jobId: job.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
          promptLength: prompt.length,
          priorVerses: previousVerses.length,
          referencedArtifacts,
        }),
      );

      generationStartedAt = Date.now();
      const generationResult = await generateIllustrationBuffer(
        client,
        model,
        messages,
      );
      responseId = generationResult.response.id;
      generationDurationMs = Date.now() - generationStartedAt;

      const outputText = generationResult.response.output_text;
      const responseSummary =
        typeof outputText === "string" && outputText.trim().length > 0
          ? outputText.trim()
          : null;

      console.info(
        JSON.stringify({
          event: "song_generation_image_generated",
          jobId: job.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
          responseId,
          generationDurationMs,
          conversationDepth: messages.length,
        }),
      );

      const {
        verse: updatedVerse,
        storagePath,
        thumbnailPath,
      } = await saveVerseIllustration({
        songId: song.id,
        verseId: verse.id,
        imageData: bufferToArrayBuffer(generationResult.buffer),
      });

      console.info(
        JSON.stringify({
          event: "song_generation_verse_updated",
          jobId: job.id,
          verseId: verse.id,
          verseSequence: verse.sequenceNumber,
          illustrationUrl: updatedVerse.illustrationUrl,
          responseId,
          thumbnailPath,
        }),
      );

      await recordSongGenerationVerseArtifact({
        jobId: job.id,
        verseId: verse.id,
        prompt,
        provider: PROVIDER,
        model,
        imageUrl: updatedVerse.illustrationUrl,
        imagePath: storagePath,
        thumbnailPath,
        imageSummary: responseSummary,
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
          responseId,
          totalDurationMs: Date.now() - jobStartedAt,
          generationDurationMs,
          responseSummaryLength: responseSummary?.length ?? 0,
        }),
      );

      return {
        jobId: job.id,
        songId: song.id,
        verseSequence: updatedVerse.sequenceNumber,
        conversationId,
        responseId,
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
          conversationId,
          responseId,
          totalDurationMs: Date.now() - jobStartedAt,
          generationDurationMs:
            generationStartedAt !== null
              ? Date.now() - generationStartedAt
              : null,
        }),
      );
      await markSongGenerationJobFailed(job.id, message);
      throw error;
    }
  };
