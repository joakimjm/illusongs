CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token_hash bytea NOT NULL UNIQUE,
  token_last_four char(4) NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NULL,
  CHECK (octet_length(token_hash) = 32)
);

CREATE INDEX access_tokens_created_by_idx
  ON access_tokens (created_by);

CREATE TABLE token_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

INSERT INTO token_permissions (name)
VALUES ('administrator');

CREATE TABLE access_token_permissions (
  access_token_id uuid NOT NULL REFERENCES access_tokens (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES token_permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (access_token_id, permission_id)
);

CREATE INDEX access_token_permissions_access_token_id_idx
  ON access_token_permissions (access_token_id);

CREATE INDEX access_token_permissions_permission_id_idx
  ON access_token_permissions (permission_id);
