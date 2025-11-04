BEGIN;

ALTER TABLE song_generation_verse_artifacts
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS image_summary TEXT;

COMMIT;

