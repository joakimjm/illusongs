import { Buffer } from "node:buffer";
import OpenAI from "openai";
import {
  getOpenAiImageApiKey,
  getOpenAiImageQuality,
  getOpenAiImageSize,
} from "@/features/songs/song-generation-config";
import { ART_STYLE_BLOCK } from "@/features/songs/song-generation-prompts";
import {
  markSongGenerationJobCompleted,
  markSongGenerationJobFailed,
  recordSongGenerationVerseArtifact,
} from "@/features/songs/song-generation-queue";
import { bufferToArrayBuffer } from "@/features/songs/song-generation-runner-shared";
import type {
  SongGenerationRunResult,
  SongGenerationStrategyContext,
} from "@/features/songs/song-generation-runner-types";
import { saveVerseIllustration } from "@/features/songs/verse-illustration-service";

export const OPENAI_IMAGES_PROVIDER = "openai_images" as const;

const createOpenAiClient = (): OpenAI =>
  new OpenAI({
    apiKey: getOpenAiImageApiKey(),
  });

const decodeBase64Image = (value: string): Buffer => {
  const normalized = value.includes(",")
    ? value.slice(value.lastIndexOf(",") + 1)
    : value;
  return Buffer.from(normalized, "base64");
};

const buildOpenAiImagePrompt = (
  context: SongGenerationStrategyContext,
): string => {
  const segments: string[] = [
    [
      "Create a single illustration for the next verse in an illustrated song.",
      "Maintain this established art style and emotional tone across every frame:",
      "",
      ART_STYLE_BLOCK,
    ].join("\n"),
    "Preserve character continuity, staging, and palette choices across the full song.",
  ];

  for (const verse of context.previousVerses) {
    const artifact = context.artifactsByVerseId.get(verse.id);
    const summary = artifact?.imageSummary?.trim().length
      ? artifact.imageSummary.trim()
      : `Illustration already established for verse ${verse.sequenceNumber}. Maintain visual continuity with that scene.`;

    segments.push(
      [
        `Previous verse ${verse.sequenceNumber} lyric:`,
        verse.lyricText.trim(),
        "",
        `Illustration summary: ${summary}`,
      ].join("\n"),
    );
  }

  segments.push(
    [
      `Current verse ${context.verse.sequenceNumber} lyric:`,
      context.verse.lyricText.trim(),
    ].join("\n"),
  );
  segments.push(`Illustration prompt: ${context.prompt}`);

  return segments.join("\n\n");
};

export const runSongGenerationWithOpenAiImages = async (
  context: SongGenerationStrategyContext,
): Promise<SongGenerationRunResult> => {
  const client = createOpenAiClient();
  const imageSize = getOpenAiImageSize();
  const imageQuality = getOpenAiImageQuality();
  const jobStartedAt = context.jobStartedAt;
  let generationStartedAt: number | null = null;
  let generationDurationMs: number | null = null;

  console.info(
    JSON.stringify({
      event: "song_generation_job_claimed",
      jobId: context.job.id,
      songId: context.job.songId,
      verseId: context.verse.id,
      verseSequence: context.verse.sequenceNumber,
      attempts: context.job.attempts,
      provider: OPENAI_IMAGES_PROVIDER,
      model: context.model,
      hasExistingConversation: false,
    }),
  );

  try {
    console.info(
      JSON.stringify({
        event: "song_generation_prompt_created",
        jobId: context.job.id,
        verseId: context.verse.id,
        verseSequence: context.verse.sequenceNumber,
        promptLength: context.prompt.length,
        priorVerses: context.previousVerses.length,
        referencedArtifacts: context.referencedArtifacts,
        provider: OPENAI_IMAGES_PROVIDER,
        model: context.model,
        promptVariant: "openai_images",
      }),
    );

    generationStartedAt = Date.now();
    const openAiPrompt = buildOpenAiImagePrompt(context);
    const response = await client.images.generate({
      model: context.model,
      prompt: openAiPrompt,
      n: 1,
      size: imageSize,
      quality: imageQuality,
      output_format: "png",
    });
    const imageData = response.data?.[0]?.b64_json ?? null;
    if (imageData === null) {
      throw new Error("Image generation response missing image data.");
    }
    const generationBuffer = decodeBase64Image(imageData);
    generationDurationMs = Date.now() - generationStartedAt;
    const revisedPrompt = response.data?.[0]?.revised_prompt?.trim() ?? "";
    const responseSummary =
      revisedPrompt.length > 0 ? revisedPrompt : context.prompt;

    console.info(
      JSON.stringify({
        event: "song_generation_image_generated",
        jobId: context.job.id,
        verseId: context.verse.id,
        verseSequence: context.verse.sequenceNumber,
        responseId: null,
        generationDurationMs,
        provider: OPENAI_IMAGES_PROVIDER,
        model: context.model,
        conversationId: null,
        imageSize,
        imageQuality,
        promptTextLength: openAiPrompt.length,
      }),
    );

    const {
      verse: updatedVerse,
      storagePath,
      thumbnailPath,
    } = await saveVerseIllustration({
      songId: context.song.id,
      verseId: context.verse.id,
      imageData: bufferToArrayBuffer(generationBuffer),
    });

    console.info(
      JSON.stringify({
        event: "song_generation_verse_updated",
        jobId: context.job.id,
        verseId: context.verse.id,
        verseSequence: context.verse.sequenceNumber,
        illustrationUrl: updatedVerse.illustrationUrl,
        responseId: null,
        provider: OPENAI_IMAGES_PROVIDER,
        model: context.model,
        thumbnailPath,
      }),
    );

    await recordSongGenerationVerseArtifact({
      jobId: context.job.id,
      verseId: context.verse.id,
      prompt: context.prompt,
      provider: OPENAI_IMAGES_PROVIDER,
      model: context.model,
      imageUrl: updatedVerse.illustrationUrl,
      imagePath: storagePath,
      thumbnailPath,
      imageSummary: responseSummary,
    });

    await markSongGenerationJobCompleted(context.job.id);

    console.info(
      JSON.stringify({
        event: "song_generation_job_completed",
        jobId: context.job.id,
        songId: context.song.id,
        verseId: context.verse.id,
        verseSequence: updatedVerse.sequenceNumber,
        conversationId: null,
        responseId: null,
        provider: OPENAI_IMAGES_PROVIDER,
        model: context.model,
        totalDurationMs: Date.now() - jobStartedAt,
        generationDurationMs,
        responseSummaryLength: responseSummary.length,
      }),
    );

    return {
      jobId: context.job.id,
      songId: context.song.id,
      verseSequence: updatedVerse.sequenceNumber,
      provider: OPENAI_IMAGES_PROVIDER,
      model: context.model,
      conversationId: null,
      responseId: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: "song_generation_job_failed",
        jobId: context.job.id,
        songId: context.song.id,
        verseId: context.verse.id,
        verseSequence: context.verse.sequenceNumber,
        error: message,
        conversationId: null,
        responseId: null,
        provider: OPENAI_IMAGES_PROVIDER,
        model: context.model,
        totalDurationMs: Date.now() - jobStartedAt,
        generationDurationMs:
          generationStartedAt !== null
            ? Date.now() - generationStartedAt
            : null,
      }),
    );
    await markSongGenerationJobFailed(context.job.id, message);
    throw error;
  }
};
