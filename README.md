Illusongs is a generative illustrated songbook for Danish children’s and folk songs.

Built with Next.js, Supabase, and OpenAI’s API, it combines nostalgic design with modern AI tooling to automate the creation of illustrated verses.  
The project aims to bring song culture back into everyday family life through artful, quiet, and connective experiences.

## Local database

- `podman compose up` to start Postgres and pgAdmin.
- Visit <http://localhost:5050>. The `Illusongs` server is preconfigured;
  use database password `illusongs` when prompted.
- `podman compose down` stops the containers; add `-v` to discard persisted
  pgAdmin/DB data.

## Supabase configuration

- `SUPABASE_STORAGE_ACCESS_TOKEN` is required for server-side uploads to Supabase Storage.
- `SUPABASE_VERSE_ILLUSTRATIONS_BUCKET` controls where verse illustrations are stored; it defaults to `verse-illustrations` locally.
- Ensure the configured bucket allows public reads and restricts writes to the storage access token.

## Tests

- Ensure the containers are running and the test database is reachable.
- `POSTGRES_CONNECTION_STRING` should point at the `illusongs_tests` database
  (comes from `.env.test`).
- Run `npm run test` for the full suite or `npm run test:watch` for watch mode.

## Uploading verse illustrations

- Upload via `POST /api/song/{songId}/verse/{verseId}/illustration` with an administrator token; the endpoint converts to WebP, stores in Supabase, and updates the verse record.
- For bulk migration, iterate over local assets with your own tooling (see `curl` example in the docs) and call the endpoint per verse to keep the database and storage in sync.

## Song generation workflow

- Create unpublished drafts through `POST /api/admin/songs` with `title` and a multiline `verses` payload. The server splits verses, stores them in order, and enqueues a `song_generation_jobs` row.
- Trigger `GET /api/song-generation/dispatch` (e.g. via CRON) to process the next pending verse. Each call generates one illustration through OpenRouter, uploads it to Supabase Storage, records artifacts, and returns `204` when no work remains.
- Configure `OPENROUTER_API_KEY` (and optional `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`, `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE`) so the dispatcher can reach your chosen provider.
