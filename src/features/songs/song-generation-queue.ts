import type { PoolClient } from "pg";
import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import {
  createVerseIllustrationBasePrompt,
  createVerseIllustrationPrompt,
} from "@/features/songs/song-generation-prompts";
import type {
  SongGenerationJobStatus,
  SongGenerationJobSto,
  SongGenerationVerseArtifactSto,
} from "@/features/songs/song-generation-stos";
import { mapSongStoToDetailDto } from "@/features/songs/song-mapping";
import type {
  SongSto,
  SongTagSto,
  SongVerseSto,
} from "@/features/songs/song-stos";
import type { SongDetailDto, SongVerseDto } from "@/features/songs/song-types";

type SongGenerationJobDto = {
  id: string;
  songId: string;
  verseId: string;
  additionalPromptDirection: string | null;
  status: SongGenerationJobStatus;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type SongGenerationJobClaim = {
  job: SongGenerationJobDto;
  song: SongDetailDto;
  verse: SongVerseDto;
};

type SongGenerationJobListItem = SongGenerationJobDto & {
  verseSequence: number;
  verseLyric: string;
  songTitle: string;
  songSlug: string;
  isPublished: boolean;
  verseIllustrationUrl: string | null;
  conversationId: string | null;
};

export type ResetSongGenerationJobResult = {
  jobId: string;
  songId: string;
  verseId: string;
  imagePath: string | null;
  thumbnailPath: string | null;
};

export type SongGenerationPromptPreview = {
  jobId: string;
  songId: string;
  verseId: string;
  verseSequence: number;
  additionalPromptDirection: string | null;
  basePrompt: string;
  fullPrompt: string;
};

const JOB_COLUMNS = `
  id,
  song_id,
  verse_id,
  additional_prompt_direction,
  status,
  attempts,
  started_at,
  completed_at,
  last_error,
  created_at,
  updated_at
`;

const normalizeAdditionalPromptDirection = (
  additionalPromptDirection: string | null | undefined,
): string | null => {
  if (typeof additionalPromptDirection !== "string") {
    return null;
  }
  const normalized = additionalPromptDirection.trim();
  return normalized.length > 0 ? normalized : null;
};

const mapJobStoToDto = (job: SongGenerationJobSto): SongGenerationJobDto => ({
  id: job.id,
  songId: job.song_id,
  verseId: job.verse_id,
  additionalPromptDirection: normalizeAdditionalPromptDirection(
    job.additional_prompt_direction,
  ),
  status: job.status,
  attempts: job.attempts,
  startedAt: job.started_at ? job.started_at.toISOString() : null,
  completedAt: job.completed_at ? job.completed_at.toISOString() : null,
  lastError: job.last_error,
  createdAt: job.created_at.toISOString(),
  updatedAt: job.updated_at.toISOString(),
});

const fetchSongDetailById = async (
  client: PoolClient,
  songId: string,
): Promise<SongDetailDto> => {
  const songResult = await client.query<SongSto>(
    `
      SELECT
        id,
        slug,
        title,
        language_code,
        is_published,
        created_at,
        updated_at
      FROM songs
      WHERE id = $1
      LIMIT 1
    `,
    [songId],
  );

  const song = songResult.rows[0];
  if (!song) {
    throw new Error(`Song ${songId} not found for generation job.`);
  }

  const tagResult = await client.query<SongTagSto>(
    `
      SELECT
        tag_name::text AS tag_name
      FROM song_tags
      WHERE song_id = $1
      ORDER BY tag_name
    `,
    [songId],
  );

  const verseResult = await client.query<SongVerseSto>(
    `
      SELECT
        id,
        song_id,
        sequence_number,
        lyric_text,
        illustration_url,
        created_at,
        updated_at
      FROM song_verses
      WHERE song_id = $1
      ORDER BY sequence_number
    `,
    [songId],
  );

  return mapSongStoToDetailDto(song, tagResult.rows, verseResult.rows);
};

export const enqueueSongGenerationJobs = async (
  client: PoolClient,
  songId: string,
  verses: readonly { id: string; sequenceNumber: number }[],
): Promise<void> => {
  if (verses.length === 0) {
    return;
  }

  const ordered = [...verses].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber,
  );

  for (const verse of ordered) {
    await client.query(
      `
        INSERT INTO song_generation_jobs (
          song_id,
          verse_id,
          status,
          attempts
        )
        VALUES ($1, $2, 'pending', 0)
        ON CONFLICT (verse_id) DO NOTHING
      `,
      [songId, verse.id],
    );
  }
};

const claimJobRow = async (
  client: PoolClient,
): Promise<SongGenerationJobSto | null> => {
  const result = await client.query<SongGenerationJobSto>(
    `
      SELECT ${JOB_COLUMNS}
      FROM song_generation_jobs
      WHERE status = 'pending'
      ORDER BY
        created_at ASC,
        (SELECT sequence_number FROM song_verses WHERE id = verse_id) ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `,
  );

  const job = result.rows[0];
  if (!job) {
    return null;
  }

  const update = await client.query<SongGenerationJobSto>(
    `
      UPDATE song_generation_jobs
      SET
        status = 'in_progress',
        attempts = attempts + 1,
        started_at = COALESCE(started_at, NOW()),
        last_error = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING ${JOB_COLUMNS}
    `,
    [job.id],
  );

  const updated = update.rows[0];
  if (!updated) {
    throw new Error("Failed to transition job to in_progress.");
  }

  return updated;
};

export const claimNextSongGenerationJob =
  async (): Promise<SongGenerationJobClaim | null> => {
    const connection = getPostgresConnection();

    return await connection.clientUsing(async (client) => {
      const job = await claimJobRow(client);
      if (!job) {
        return null;
      }

      const song = await fetchSongDetailById(client, job.song_id);
      const verse = song.verses.find((entry) => entry.id === job.verse_id);

      if (!verse) {
        throw new Error(
          `Verse ${job.verse_id} not found for song ${job.song_id}.`,
        );
      }

      return {
        job: mapJobStoToDto(job),
        song,
        verse,
      };
    });
  };

type SongGenerationJobListRow = {
  id: string;
  song_id: string;
  verse_id: string;
  additional_prompt_direction: string | null;
  status: SongGenerationJobStatus;
  attempts: number;
  started_at: Date | null;
  completed_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  song_title: string;
  song_slug: string;
  is_published: boolean;
  verse_sequence_number: number;
  verse_lyric_text: string;
  verse_illustration_url: string | null;
  conversation_id: string | null;
};

const mapJobListRow = (
  row: SongGenerationJobListRow,
): SongGenerationJobListItem => ({
  id: row.id,
  songId: row.song_id,
  verseId: row.verse_id,
  additionalPromptDirection: normalizeAdditionalPromptDirection(
    row.additional_prompt_direction,
  ),
  status: row.status,
  attempts: row.attempts,
  startedAt: row.started_at ? row.started_at.toISOString() : null,
  completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  lastError: row.last_error,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  songTitle: row.song_title,
  songSlug: row.song_slug,
  isPublished: row.is_published,
  verseSequence: row.verse_sequence_number,
  verseLyric: row.verse_lyric_text,
  verseIllustrationUrl: row.verse_illustration_url,
  conversationId: row.conversation_id,
});

type JobListFilters = {
  limit?: number;
  excludePublished?: boolean;
  searchText?: string | null;
};

export const fetchSongGenerationJobList = async (
  filters: number | JobListFilters = 50,
): Promise<SongGenerationJobListItem[]> => {
  const connection = getPostgresConnection();
  const normalizedFilters: JobListFilters =
    typeof filters === "number" ? { limit: filters } : filters;
  const limit = normalizedFilters.limit ?? 50;
  const excludePublished = normalizedFilters.excludePublished ?? false;
  const searchTextRaw = normalizedFilters.searchText ?? null;
  const searchText =
    searchTextRaw && searchTextRaw.trim().length > 0
      ? `%${searchTextRaw.trim()}%`
      : null;

  return await connection.clientUsing(async (client) => {
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    let paramIndex = 1;

    if (excludePublished) {
      conditions.push("s.is_published = false");
    }

    if (searchText) {
      conditions.push(
        `(s.title ILIKE $${paramIndex} OR v.lyric_text ILIKE $${paramIndex})`,
      );
      params.push(searchText);
      paramIndex += 1;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit);

    const result = await client.query<SongGenerationJobListRow>(
      `
        SELECT
          j.id,
          j.song_id,
          j.verse_id,
          j.additional_prompt_direction,
          j.status,
          j.attempts,
          j.started_at,
          j.completed_at,
          j.last_error,
          j.created_at,
          j.updated_at,
          s.title AS song_title,
          s.slug AS song_slug,
          s.is_published AS is_published,
          v.sequence_number AS verse_sequence_number,
          v.lyric_text AS verse_lyric_text,
          v.illustration_url AS verse_illustration_url,
          c.conversation_id AS conversation_id
        FROM song_generation_jobs j
        JOIN songs s ON s.id = j.song_id
        JOIN song_verses v ON v.id = j.verse_id
        LEFT JOIN song_generation_conversations c ON c.song_id = j.song_id
        ${whereClause}
        ORDER BY
          j.created_at DESC,
          v.sequence_number ASC
        LIMIT $${paramIndex}
      `,
      params,
    );

    return result.rows.map(mapJobListRow);
  });
};

export const markSongGenerationJobCompleted = async (
  jobId: string,
): Promise<void> => {
  const connection = getPostgresConnection();

  await connection.clientUsing(async (client) => {
    const result = await client.query(
      `
        UPDATE song_generation_jobs
        SET
          status = 'completed',
          completed_at = NOW(),
          last_error = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [jobId],
    );

    if (result.rowCount === 0) {
      throw new Error(`Song generation job ${jobId} not found.`);
    }
  });
};

export const markSongGenerationJobFailed = async (
  jobId: string,
  errorMessage: string,
): Promise<void> => {
  const connection = getPostgresConnection();

  await connection.clientUsing(async (client) => {
    const result = await client.query(
      `
        UPDATE song_generation_jobs
        SET
          status = 'failed',
          completed_at = NULL,
          last_error = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [jobId, errorMessage],
    );

    if (result.rowCount === 0) {
      throw new Error(`Song generation job ${jobId} not found.`);
    }
  });
};

export const resetSongGenerationJob = async (
  jobId: string,
  additionalPromptDirection?: string | null,
): Promise<ResetSongGenerationJobResult | null> => {
  const connection = getPostgresConnection();
  const shouldUpdateAdditionalPromptDirection =
    additionalPromptDirection !== undefined;
  const normalizedAdditionalPromptDirection =
    normalizeAdditionalPromptDirection(additionalPromptDirection);

  return await connection.clientUsing(async (client) => {
    const jobResult = await client.query<SongGenerationJobSto>(
      `
        SELECT ${JOB_COLUMNS}
        FROM song_generation_jobs
        WHERE id = $1
        LIMIT 1
      `,
      [jobId],
    );

    const job = jobResult.rows[0];
    if (!job) {
      return null;
    }

    const artifactResult = await client.query<{
      image_path: string | null;
      thumbnail_path: string | null;
    }>(
      `
        SELECT image_path, thumbnail_path
        FROM song_generation_verse_artifacts
        WHERE verse_id = $1
        LIMIT 1
      `,
      [job.verse_id],
    );

    await client.query(
      `
        UPDATE song_generation_jobs
        SET
          status = 'pending',
          attempts = attempts,
          started_at = NULL,
          completed_at = NULL,
          last_error = NULL,
          additional_prompt_direction = CASE
            WHEN $2::boolean THEN $3
            ELSE additional_prompt_direction
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        jobId,
        shouldUpdateAdditionalPromptDirection,
        normalizedAdditionalPromptDirection,
      ],
    );

    await client.query(
      `
        UPDATE song_verses
        SET
          illustration_url = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [job.verse_id],
    );

    await client.query(
      `
        DELETE FROM song_generation_verse_artifacts
        WHERE verse_id = $1
      `,
      [job.verse_id],
    );

    return {
      jobId: job.id,
      songId: job.song_id,
      verseId: job.verse_id,
      imagePath: artifactResult.rows[0]?.image_path ?? null,
      thumbnailPath: artifactResult.rows[0]?.thumbnail_path ?? null,
    } as ResetSongGenerationJobResult;
  });
};

export const findSongGenerationPromptPreviewByJobId = async (
  jobId: string,
): Promise<SongGenerationPromptPreview | null> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const jobResult = await client.query<SongGenerationJobSto>(
      `
        SELECT ${JOB_COLUMNS}
        FROM song_generation_jobs
        WHERE id = $1
        LIMIT 1
      `,
      [jobId],
    );

    const job = jobResult.rows[0];
    if (!job) {
      return null;
    }

    const song = await fetchSongDetailById(client, job.song_id);
    const verse = song.verses.find((entry) => entry.id === job.verse_id);
    if (!verse) {
      throw new Error(
        `Verse ${job.verse_id} not found for song ${job.song_id}.`,
      );
    }

    const additionalPromptDirection = normalizeAdditionalPromptDirection(
      job.additional_prompt_direction,
    );
    const basePrompt = createVerseIllustrationBasePrompt(song, verse);
    const fullPrompt = createVerseIllustrationPrompt(
      song,
      verse,
      additionalPromptDirection,
    );

    return {
      jobId: job.id,
      songId: job.song_id,
      verseId: job.verse_id,
      verseSequence: verse.sequenceNumber,
      additionalPromptDirection,
      basePrompt,
      fullPrompt,
    };
  });
};

type RecordArtifactInput = {
  jobId: string;
  verseId: string;
  prompt: string;
  provider: string;
  model: string;
  imageUrl: string | null;
  imagePath: string | null;
  thumbnailPath: string | null;
  imageSummary: string | null;
};

export const recordSongGenerationVerseArtifact = async (
  input: RecordArtifactInput,
): Promise<SongGenerationVerseArtifactSto> => {
  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const result = await client.query<SongGenerationVerseArtifactSto>(
      `
        INSERT INTO song_generation_verse_artifacts (
          job_id,
          verse_id,
          prompt,
          provider,
          model,
          image_url,
          image_path,
          thumbnail_path,
          image_summary
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (verse_id)
        DO UPDATE SET
          prompt = EXCLUDED.prompt,
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          image_url = EXCLUDED.image_url,
          image_path = EXCLUDED.image_path,
          thumbnail_path = EXCLUDED.thumbnail_path,
          image_summary = EXCLUDED.image_summary,
          updated_at = NOW()
        RETURNING
          id,
          job_id,
          verse_id,
          prompt,
          provider,
          model,
          image_url,
          image_path,
          thumbnail_path,
          image_summary,
          created_at,
          updated_at
      `,
      [
        input.jobId,
        input.verseId,
        input.prompt,
        input.provider,
        input.model,
        input.imageUrl,
        input.imagePath,
        input.thumbnailPath,
        input.imageSummary,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to record song generation artifact.");
    }

    return row;
  });
};
