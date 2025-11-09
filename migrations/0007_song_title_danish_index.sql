CREATE INDEX IF NOT EXISTS songs_title_da_idx
ON songs ((title COLLATE "da-x-icu"));
