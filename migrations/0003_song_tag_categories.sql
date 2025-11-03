CREATE TABLE tag_categories (
  slug text PRIMARY KEY,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags
  ADD COLUMN category_slug text REFERENCES tag_categories (slug) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX tags_category_slug_idx ON tags (category_slug);
