import type { claimNextSongGenerationJob } from "@/features/songs/song-generation-queue";
import type { SongGenerationVerseArtifactDto } from "@/features/songs/song-generation-verse-artifacts";
import type { SongDetailDto, SongVerseDto } from "@/features/songs/song-types";

export type SongGenerationJobClaim = NonNullable<
  Awaited<ReturnType<typeof claimNextSongGenerationJob>>
>;

export type SongGenerationStrategyContext = {
  job: SongGenerationJobClaim["job"];
  song: SongDetailDto;
  verse: SongVerseDto;
  prompt: string;
  previousVerses: SongVerseDto[];
  artifactsByVerseId: Map<string, SongGenerationVerseArtifactDto>;
  referencedArtifacts: number;
  jobStartedAt: number;
  provider: string;
  model: string;
};

export type SongGenerationRunResult = {
  jobId: string;
  songId: string;
  verseSequence: number;
  provider: string;
  model: string;
  conversationId: string | null;
  responseId: string | null;
};
