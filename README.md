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

- Place PNG files in the `data/` directory using the pattern `<song-slug>-<zero-padded-sequence>.png` (e.g. `aah-abe-01.png`).
- Run `ACCESS_TOKEN=<admin-token> npm run upload:illustrations`; optionally set `API_BASE_URL` and `POSTGRES_CONNECTION_STRING` if they differ from defaults.
- The script resolves verse IDs from the database, uploads via the illustration API, and reports skipped or failed files.
