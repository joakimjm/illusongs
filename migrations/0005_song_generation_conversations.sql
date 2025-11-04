CREATE TABLE song_generation_conversations (
  song_id uuid PRIMARY KEY REFERENCES songs (id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  conversation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_song_generation_conversations_updated_at
BEFORE UPDATE ON song_generation_conversations
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
