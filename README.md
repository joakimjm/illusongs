Illusongs is a generative illustrated songbook for Danish children’s and folk songs.

Built with Next.js, Supabase, and OpenAI’s API, it combines nostalgic design with modern AI tooling to automate the creation of illustrated verses.  
The project aims to bring song culture back into everyday family life through artful, quiet, and connective experiences.

## Local database

- `podman compose up` to start Postgres and pgAdmin.
- Visit <http://localhost:5050>. The `Illusongs` server is preconfigured;
  use database password `illusongs` when prompted.
- `podman compose down` stops the containers; add `-v` to discard persisted
  pgAdmin/DB data.

## Tests

- Ensure the containers are running and the test database is reachable.
- `POSTGRES_CONNECTION_STRING` should point at the `illusongs_tests` database
  (comes from `.env.test`).
- Run `npm run test` for the full suite or `npm run test:watch` for watch mode.
