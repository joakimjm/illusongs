CREATE TABLE song_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'failed', 'completed')),
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX song_generation_jobs_status_created_idx
  ON song_generation_jobs (status, created_at);

CREATE INDEX song_generation_jobs_song_id_idx
  ON song_generation_jobs (song_id);

CREATE TRIGGER set_song_generation_jobs_updated_at
BEFORE UPDATE ON song_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE song_generation_verse_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES song_generation_jobs (id) ON DELETE CASCADE,
  verse_id uuid NOT NULL REFERENCES song_verses (id) ON DELETE CASCADE,
  prompt text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  image_url text,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, verse_id)
);

CREATE INDEX song_generation_verse_artifacts_job_id_idx
  ON song_generation_verse_artifacts (job_id);

CREATE INDEX song_generation_verse_artifacts_verse_id_idx
  ON song_generation_verse_artifacts (verse_id);

CREATE TRIGGER set_song_generation_verse_artifacts_updated_at
BEFORE UPDATE ON song_generation_verse_artifacts
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
