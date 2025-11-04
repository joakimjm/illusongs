# Image Generation Workflow

## Overview

This document describes how Illusongs ingests song drafts, generates verse-level illustrations, and surfaces operational controls for editors. The pipeline is intentionally sequential per verse to preserve the prompt conversation and visual consistency.

## Draft Intake

1. **Admin UI** (`/admin/songs`)
   - Editors paste a title and multi-verse text in the “Create song draft” panel.
   - The server splits verses on blank lines, normalizes tags, and stores an unpublished song (`createSongDraft`).
2. **Job Enqueue**
   - Each verse produces one pending row in `song_generation_jobs` ordered by `sequence_number`.
   - A `song_generation_conversations` record is created lazily during the first generation per song.

## Dispatcher & Conversation Handling

1. **Claiming Jobs**
   - `/api/song-generation/dispatch` calls `processNextSongGenerationJob`, which:
     - Grabs the oldest `pending` verse job ordered by `created_at`, `sequence_number` (ties broken by the sequence).
     - Loads song + verse data for prompts.
2. **Conversation Context**
   - `song_generation_conversations` tracks `provider`, `model`, and `conversation_id` per song.
   - If absent (first verse) a UUID conversation id is generated and stored.
   - Subsequent verses reuse the same id, keeping prompts in one conversation.
3. **Prompt & OpenRouter Call**
   - Verse 1 uses `createInitialSongIllustrationPrompt`; others use `createNextVerseIllustrationPrompt`.
   - Previous verse artifacts are replayed as assistant turns (summary text + thumbnail image) so the model keeps palette and characters consistent.
   - Images are generated via OpenRouter (using the official OpenAI SDK with `X-Conversation-ID`).
4. **Supabase Storage & Records**
   - `saveVerseIllustration` transcodes the full image, generates a low-res thumbnail, uploads both to `SUPABASE_VERSE_ILLUSTRATIONS_BUCKET`, and updates `song_verses.illustration_url`.
   - `recordSongGenerationVerseArtifact` stores prompt, provider, model, main image path, thumbnail path, and the model’s textual summary for audit and future prompts.
5. **Job Completion**
   - On success: job → `completed`. The dispatcher returns `204` when no work remains.
   - On failure: job → `failed` with `last_error`; editors can requeue.

## Admin Controls

### Songs Page (`/admin/songs`)
- Shows drafts + published songs with verse counts and queued jobs.
- “Publish/Unpublish” toggles call `updateSongPublishStatus`.
- “Create song draft” form enqueues new jobs immediately.

### Jobs Page (`/admin/jobs`)
- Renders the verse-level queue ordered by status and verse sequence.
- “Process next job” triggers the dispatcher and refreshes the list after every run.
- Each row includes a “Requeue” action to retry failed jobs (status resets to `pending`, original ordering preserved).

## Key Tables

```text
song_generation_jobs
  id, song_id, verse_id, status, attempts, started_at, completed_at, last_error

song_generation_conversations
  song_id (PK), provider, model, conversation_id, timestamps

song_generation_verse_artifacts
  job_id, verse_id, prompt, provider, model, image_url, image_path, thumbnail_path, image_summary, timestamps
```

## Configuration

- `OPENROUTER_API_KEY` (required) and optional overrides: `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`, `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE`.
- Supabase storage bucket name via `SUPABASE_VERSE_ILLUSTRATIONS_BUCKET`.

## Cron / Automation

- Schedule a GET to `/api/song-generation/dispatch` (e.g. Vercel Cron) to process the queue continuously.
- Editors can also run jobs manually from `/admin/jobs` during reviews.

---

Future ideas: expose batch processing, conversation resets, or richer job telemetry if generation retrains require manual oversight.
