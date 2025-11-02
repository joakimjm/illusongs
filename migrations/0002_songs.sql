CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  title text NOT NULL,
  language_code varchar(8) NOT NULL DEFAULT 'da',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (slug = lower(slug))
);

CREATE TABLE song_verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
  sequence_number int NOT NULL CHECK (sequence_number > 0),
  lyric_text text NOT NULL,
  illustration_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (song_id, sequence_number)
);

CREATE TABLE tags (
  name citext PRIMARY KEY,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE song_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
  tag_name citext NOT NULL REFERENCES tags (name) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (song_id, tag_name)
);

CREATE INDEX song_tags_tag_name_idx ON song_tags (tag_name);

CREATE TRIGGER set_songs_updated_at
BEFORE UPDATE ON songs
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TRIGGER set_song_verses_updated_at
BEFORE UPDATE ON song_verses
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
