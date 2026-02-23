BEGIN;

ALTER TABLE song_generation_jobs
  ADD COLUMN IF NOT EXISTS additional_prompt_direction TEXT;

COMMIT;
