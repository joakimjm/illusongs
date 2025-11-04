export type SongGenerationJobStatus =
  | "pending"
  | "in_progress"
  | "failed"
  | "completed";

export type SongGenerationJobSto = {
  id: string;
  song_id: string;
  verse_id: string;
  status: SongGenerationJobStatus;
  attempts: number;
  started_at: Date | null;
  completed_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SongGenerationVerseArtifactSto = {
  id: string;
  job_id: string;
  verse_id: string;
  prompt: string;
  provider: string;
  model: string;
  image_url: string | null;
  image_path: string | null;
  thumbnail_path: string | null;
  image_summary: string | null;
  created_at: Date;
  updated_at: Date;
};
