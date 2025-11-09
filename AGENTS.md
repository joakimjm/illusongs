<project_overview>
Illusongs operates within the domain of **illustrated songs**.  
Agents collaborate to:
- Parse new song input into structured data.  
- Generate verse-by-verse image prompts in the established visual style.  
- Maintain stylistic and emotional coherence across songs.  
- Ensure that output supports the goal of *human connection through song and illustration* rather than distraction or spectacle.

The domain tone is warm, poetic, vintage, and emotionally intelligent.

PostgreSQL migrations, Docker Compose, and an access-token administration surface for authentication in automation.

Here's a non-exhaustive example of how files are organized for the "Tokens" feature:

src/features/tokens/
  token-types.ts               # Shared domain types for issued access tokens
  token-commands.ts            # Commands: createAccessToken, revokeAccessToken
  token-commands.test.ts
  token-queries.ts             # Queries: listAccessTokens, getAccessTokenById (with permissions)
  token-stos.ts                # Database storage objects and SQL helpers
  token-mapping.ts             # Maps storage-layer records to domain DTOs

Here's how these capabilities surface through the API routes (non-exhaustive):

Access token administration (requires admin privileges):
/api/tokens                             GET (list), POST (create)
/api/tokens/[tokenId]                  DELETE (revoke)
</project_overview>

<code_editing_rules>
<guiding_principles>
- TypeScript “strict” everywhere. No "any", no "unknown", no casts. All strings use double quotes.
- Arrow functions only; keep functions small and pure. Side effects only at I/O boundaries (HTTP, DB, logging).
- Variables use const unless mutation is essential (justify in a comment).
- Naming: Components PascalCase; vars/functions camelCase; constants UPPER_SNAKE_CASE; files kebab-case.
</guiding_principles>

<frontend_stack_defaults>
- Minimalist, responsive UI with full light/dark parity. WCAG 2.1 AA minimum.
- Prefer Server Components; add "use client" only for interactivity (forms, events).
- State: prefer server data via RSC and fetch; if @tanstack/react-query is present, use it for client mutations/queries. Avoid prop drilling; use Context sparingly.
- React compiler is enabled
</frontend_stack_defaults>
</code_editing_rules>

<auth_and_security>
- Auth via Supabase (Azure).
- Enforce resource ownership and invariants before mutation. No sensitive details in client-visible errors.
- Structured logs only at API boundaries; scrub PII; include correlation IDs when available.
</auth_and_security>

<testing_and_ci>
- Test files are co-located with source files, named *.test.ts with exception of integration tests that live in /src/features/integration-tests.
- Runner: Vitest. UI tests use @testing-library/react + jsdom; domain/API tests run in Node env.
- Coverage: enable v8 coverage; enforce thresholds on pure/domain modules (lines, branches, functions, statements ≥90%).
- Required CI gates before merge: typecheck, lint, unit tests with coverage. Optional: a11y snapshots for key views.
- CI and hosting is provided by Vercel
- Use `npm run lint:fix` to auto-fix lint issues and disregard warnings for files you haven't changed as multiple agents may be working simultaneously.
- Test using `npm run test`. If you have trouble with postgres, you can set VITEST_SKIP_DB=true to skip setup and teardown of the test database.
- Build using `npm run build`
- podman instead of docker for local containers
- Run `check:dupe` to check for copy-paste code duplication
- Run `check:unused` to check for unused dependencies
</testing_and_ci>

<operating_mode>
<reasoning_effort>
- low: trivial refactors, copy edits, type tweaks.
- medium (default): new component, small API route
- high: cross-cutting changes, schema/auth/session logic.
</reasoning_effort>
</operating_mode>


<rules_for_git>
- Delete unused or obsolete files when your changes make them irrelevant (refactors, feature removals, etc.), and revert files only when the change is yours or explicitly requested. If a git operation leaves you unsure about other agents' in-flight work, stop and coordinate instead of deleting.
- **Before attempting to delete a file to resolve a local type/lint failure, stop and ask the user.** Other agents are often editing adjacent files; deleting their work to silence an error is never acceptable without explicit approval.
- NEVER edit `.env` or any environment variable files—only the user may change them.
- Coordinate with other agents before removing their in-progress edits—don't revert or delete work you didn't author unless everyone agrees.
- Moving/renaming and restoring files is allowed.
- ABSOLUTELY NEVER run destructive git operations (e.g., `git reset --hard`, `rm`, `git checkout`/`git restore` to an older commit) unless the user gives an explicit, written instruction in this conversation. Treat these commands as catastrophic; if you are even slightly unsure, stop and ask before touching them. *(When working within Cursor or Codex Web, these git limitations do not apply; use the tooling's capabilities as needed.)*
- Never use `git restore` (or similar commands) to revert files you didn't author—coordinate with other agents instead so their in-progress work stays intact.
- Always double-check git status before any commit
- Keep commits atomic: commit only the files you touched and list each path explicitly. For tracked files run `git commit -m "<scoped message>" -- path/to/file1 path/to/file2`. For brand-new files, use the one-liner `git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2`.
- Quote any git paths containing brackets or parentheses (e.g., `src/app/[candidate]/**`) when staging or committing so the shell does not treat them as globs or subshells.
- When running `git rebase`, avoid opening editors—export `GIT_EDITOR=:` and `GIT_SEQUENCE_EDITOR=:` (or pass `--no-edit`) so the default messages are used automatically.
- Never amend commits unless you have explicit written approval in the task thread.
</rules_for_git>
