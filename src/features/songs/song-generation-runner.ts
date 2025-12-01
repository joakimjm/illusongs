import { getRequiredConfigValue } from "@/config";
import {
  getOpenAiImageModel,
  isOpenAiImageGenerationEnabled,
} from "@/features/songs/song-generation-config";
import {
  createInitialSongIllustrationPrompt,
  createNextVerseIllustrationPrompt,
} from "@/features/songs/song-generation-prompts";
import {
  claimNextSongGenerationJob,
  markSongGenerationJobFailed,
} from "@/features/songs/song-generation-queue";
import {
  OPENAI_IMAGES_PROVIDER,
  runSongGenerationWithOpenAiImages,
} from "@/features/songs/song-generation-runner-openai";
import {
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_PROVIDER,
  runSongGenerationWithOpenRouter,
} from "@/features/songs/song-generation-runner-openrouter";
import { getSortedPreviousVerses } from "@/features/songs/song-generation-runner-shared";
import type {
  SongGenerationJobClaim,
  SongGenerationRunResult,
  SongGenerationStrategyContext,
} from "@/features/songs/song-generation-runner-types";
import {
  fetchSongGenerationVerseArtifactsBySong,
  type SongGenerationVerseArtifactDto,
} from "@/features/songs/song-generation-verse-artifacts";

export type { SongGenerationRunResult } from "@/features/songs/song-generation-runner-types";

const createArtifactsMap = (
  artifacts: SongGenerationVerseArtifactDto[],
): Map<string, SongGenerationVerseArtifactDto> =>
  new Map(artifacts.map((artifact) => [artifact.verseId, artifact]));

const resolveOpenRouterModel = (): string => {
  const value = getRequiredConfigValue(
    "OPENROUTER_MODEL",
    OPENROUTER_DEFAULT_MODEL,
  ).trim();
  return value.length > 0 ? value : OPENROUTER_DEFAULT_MODEL;
};

const buildStrategyContext = async (
  claim: SongGenerationJobClaim,
  provider: string,
  model: string,
): Promise<SongGenerationStrategyContext> => {
  const { job, song, verse } = claim;
  const jobStartedAt = Date.now();

  const artifacts = await fetchSongGenerationVerseArtifactsBySong(song.id);
  const artifactsByVerseId = createArtifactsMap(artifacts);

  const prompt =
    verse.sequenceNumber === 1
      ? createInitialSongIllustrationPrompt(song)
      : createNextVerseIllustrationPrompt(verse);

  const previousVerses = getSortedPreviousVerses(song, verse);
  const referencedArtifacts = previousVerses.filter((entry) =>
    artifactsByVerseId.has(entry.id),
  ).length;

  return {
    job,
    song,
    verse,
    prompt,
    previousVerses,
    artifactsByVerseId,
    referencedArtifacts,
    jobStartedAt,
    provider,
    model,
  };
};

export const processNextSongGenerationJob =
  async (): Promise<SongGenerationRunResult | null> => {
    const useOpenAiImages = isOpenAiImageGenerationEnabled();
    const provider = useOpenAiImages
      ? OPENAI_IMAGES_PROVIDER
      : OPENROUTER_PROVIDER;
    const model = useOpenAiImages
      ? getOpenAiImageModel()
      : resolveOpenRouterModel();

    const claim = await claimNextSongGenerationJob();

    if (!claim) {
      console.info(
        JSON.stringify({
          event: "song_generation_job_none_available",
          provider,
          model,
        }),
      );
      return null;
    }

    let context: SongGenerationStrategyContext;
    try {
      context = await buildStrategyContext(claim, provider, model);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markSongGenerationJobFailed(claim.job.id, message);
      throw error;
    }

    if (useOpenAiImages) {
      return await runSongGenerationWithOpenAiImages(context);
    }

    return await runSongGenerationWithOpenRouter(context);
  };
