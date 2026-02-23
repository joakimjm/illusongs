import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { createSongWithClient } from "@/features/songs/song-commands";
import { enqueueSongGenerationJobs } from "@/features/songs/song-generation-queue";
import type { SongDetailDto } from "@/features/songs/song-types";

export class InvalidSongDraftError extends Error {}
export class InvalidSongVerseUpdateError extends Error {}

const DEFAULT_LANGUAGE = "da";

const normalizeWhitespace = (value: string): string =>
  value.replaceAll(/\r\n/g, "\n");

export const splitSongDraftVerses = (raw: string): string[] => {
  const normalized = normalizeWhitespace(raw).trim();
  if (normalized.length === 0) {
    return [];
  }

  return normalized
    .split(/\n\s*\n/g)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
};

const replaceScandinavianCharacters = (value: string): string =>
  value
    .replaceAll(/æ/gi, (match) => (match === match.toUpperCase() ? "Ae" : "ae"))
    .replaceAll(/ø/gi, (match) => (match === match.toUpperCase() ? "O" : "o"))
    .replaceAll(/å/gi, (match) =>
      match === match.toUpperCase() ? "Aa" : "aa",
    );

const removeDiacritics = (value: string): string =>
  value.normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "");

const SLUG_ALLOWED = /[^a-z0-9-]+/g;

export const slugifySongTitle = (title: string): string => {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new InvalidSongDraftError("Song title is required.");
  }

  const base = replaceScandinavianCharacters(trimmed.toLowerCase());
  const normalized = removeDiacritics(base)
    .replaceAll(/\s+/g, "-")
    .replaceAll(SLUG_ALLOWED, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length === 0) {
    throw new InvalidSongDraftError(
      "Song title must contain at least one alphanumeric character.",
    );
  }

  return normalized;
};

const normalizeTags = (tags?: string[]): string[] =>
  Array.isArray(tags)
    ? Array.from(
        new Set(
          tags
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag) => tag.length > 0),
        ),
      )
    : [];

const normalizeVerseLyricText = (value: string): string =>
  normalizeWhitespace(value).trim();

type CreateSongDraftInput = {
  title: string;
  versesText: string;
  languageCode?: string;
  tags?: string[];
};

export type ReconcileSongVersesInput = {
  songId: string;
  versesText: string;
};

export type ReconcileSongVersesResult = {
  matchedVerseCount: number;
  significantMatchedVerseCount: number;
  insertedVerseCount: number;
  removedVerseCount: number;
  wasUnpublished: boolean;
};

type ReconcileSongVerseInput = {
  id: string;
  lyricText: string;
};

type VerseMatch = {
  oldIndex: number;
  newIndex: number;
  score: number;
};

type VerseReconciliationPlan = {
  matches: VerseMatch[];
  newVerseIndexes: number[];
  removedVerseIds: string[];
};

const RECONCILE_INDEX_WINDOW = 2;
const RECONCILE_SIMILARITY_THRESHOLD = 0.5;
const SIGNIFICANT_MATCH_THRESHOLD = 0.85;

export const createSongDraft = async (
  input: CreateSongDraftInput,
): Promise<SongDetailDto> => {
  const { title, versesText } = input;

  if (typeof title !== "string" || title.trim().length === 0) {
    throw new InvalidSongDraftError("Song title is required.");
  }

  if (typeof versesText !== "string") {
    throw new InvalidSongDraftError("Song verses text is required.");
  }

  const verses = splitSongDraftVerses(versesText);
  if (verses.length === 0) {
    throw new InvalidSongDraftError(
      "Song must contain at least one verse with content.",
    );
  }

  const slug = slugifySongTitle(title);
  const languageCode =
    typeof input.languageCode === "string" &&
    input.languageCode.trim().length > 0
      ? input.languageCode.trim()
      : DEFAULT_LANGUAGE;
  const tags = normalizeTags(input.tags);

  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const song = await createSongWithClient(client, {
      slug,
      title: title.trim(),
      languageCode,
      isPublished: false,
      tags,
      verses: verses.map((verse, index) => ({
        sequenceNumber: index + 1,
        lyricText: verse,
        illustrationUrl: null,
      })),
    });

    await enqueueSongGenerationJobs(
      client,
      song.id,
      song.verses.map((verse) => ({
        id: verse.id,
        sequenceNumber: verse.sequenceNumber,
      })),
    );

    return song;
  });
};

type SongVerseIdentityRow = {
  id: string;
  lyric_text: string;
};

type UpdatedVerseRow = {
  id: string;
};

type InsertedVerseRow = {
  id: string;
};

const normalizeForMatching = (value: string): string =>
  normalizeWhitespace(value)
    .replaceAll(/\u2028|\u2029/g, "\n")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();

const calculateLevenshteinDistance = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  const previousRow = Array.from(
    { length: right.length + 1 },
    (_value, index) => index,
  );
  const currentRow = new Array<number>(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    currentRow[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const insertion = currentRow[rightIndex - 1] + 1;
      const deletion = previousRow[rightIndex] + 1;
      const substitution = previousRow[rightIndex - 1] + substitutionCost;
      currentRow[rightIndex] = Math.min(insertion, deletion, substitution);
    }

    for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
      previousRow[rightIndex] = currentRow[rightIndex] ?? 0;
    }
  }

  return previousRow[right.length] ?? right.length;
};

const calculateNormalizedSimilarity = (left: string, right: string): number => {
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) {
    return 1;
  }

  const distance = calculateLevenshteinDistance(left, right);
  return 1 - distance / maxLength;
};

export const reconcileVersesForSongUpdate = (
  previousVerses: readonly ReconcileSongVerseInput[],
  nextVerses: readonly string[],
): VerseReconciliationPlan => {
  const previousKeys = previousVerses.map((verse) =>
    normalizeForMatching(verse.lyricText),
  );
  const nextKeys = nextVerses.map((verse) => normalizeForMatching(verse));

  const matchByPreviousIndex = previousVerses.map(
    () => null as VerseMatch | null,
  );
  const matchByNextIndex = nextVerses.map(() => null as VerseMatch | null);

  const previousExactBuckets = new Map<string, number[]>();
  previousKeys.forEach((key, previousIndex) => {
    const existing = previousExactBuckets.get(key) ?? [];
    previousExactBuckets.set(key, [...existing, previousIndex]);
  });

  nextKeys.forEach((key, nextIndex) => {
    const candidates = previousExactBuckets.get(key);
    if (!candidates || candidates.length === 0) {
      return;
    }
    const previousIndex = candidates[0];
    if (previousIndex === undefined) {
      return;
    }

    previousExactBuckets.set(key, candidates.slice(1));
    const match: VerseMatch = {
      oldIndex: previousIndex,
      newIndex: nextIndex,
      score: 1,
    };
    matchByPreviousIndex[previousIndex] = match;
    matchByNextIndex[nextIndex] = match;
  });

  const unmatchedPreviousIndexes = matchByPreviousIndex
    .map((match, previousIndex) => ({ match, previousIndex }))
    .filter((entry) => entry.match === null)
    .map((entry) => entry.previousIndex);
  const unmatchedNextIndexes = matchByNextIndex
    .map((match, nextIndex) => ({ match, nextIndex }))
    .filter((entry) => entry.match === null)
    .map((entry) => entry.nextIndex);

  const similarityCandidates: VerseMatch[] = [];
  unmatchedNextIndexes.forEach((nextIndex) => {
    unmatchedPreviousIndexes.forEach((previousIndex) => {
      if (Math.abs(previousIndex - nextIndex) > RECONCILE_INDEX_WINDOW) {
        return;
      }

      const score = calculateNormalizedSimilarity(
        previousKeys[previousIndex] ?? "",
        nextKeys[nextIndex] ?? "",
      );
      if (score < RECONCILE_SIMILARITY_THRESHOLD) {
        return;
      }

      similarityCandidates.push({
        oldIndex: previousIndex,
        newIndex: nextIndex,
        score,
      });
    });
  });

  similarityCandidates.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    const leftDistance = Math.abs(left.oldIndex - left.newIndex);
    const rightDistance = Math.abs(right.oldIndex - right.newIndex);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    if (left.oldIndex !== right.oldIndex) {
      return left.oldIndex - right.oldIndex;
    }

    return left.newIndex - right.newIndex;
  });

  similarityCandidates.forEach((candidate) => {
    if (
      matchByPreviousIndex[candidate.oldIndex] !== null ||
      matchByNextIndex[candidate.newIndex] !== null
    ) {
      return;
    }

    matchByPreviousIndex[candidate.oldIndex] = candidate;
    matchByNextIndex[candidate.newIndex] = candidate;
  });

  const matches = matchByNextIndex
    .filter((match): match is VerseMatch => match !== null)
    .sort((left, right) => left.newIndex - right.newIndex);
  const newVerseIndexes = matchByNextIndex
    .map((match, nextIndex) => ({ match, nextIndex }))
    .filter((entry) => entry.match === null)
    .map((entry) => entry.nextIndex);
  const removedVerseIds = matchByPreviousIndex
    .map((match, previousIndex) => ({ match, previousIndex }))
    .filter((entry) => entry.match === null)
    .map((entry) => previousVerses[entry.previousIndex]?.id ?? "")
    .filter((id) => id.length > 0);

  return {
    matches,
    newVerseIndexes,
    removedVerseIds,
  };
};

export const reconcileSongVerses = async (
  input: ReconcileSongVersesInput,
): Promise<ReconcileSongVersesResult> => {
  if (typeof input.versesText !== "string") {
    throw new InvalidSongVerseUpdateError("Song verses text is required.");
  }

  const nextVerses = splitSongDraftVerses(input.versesText).map(
    normalizeVerseLyricText,
  );
  if (nextVerses.length === 0) {
    throw new InvalidSongVerseUpdateError(
      "Song must contain at least one verse with content.",
    );
  }

  const connection = getPostgresConnection();

  return await connection.clientUsing(async (client) => {
    const existingVerseResult = await client.query<SongVerseIdentityRow>(
      `
        SELECT
          id,
          lyric_text
        FROM song_verses
        WHERE song_id = $1
        ORDER BY sequence_number
      `,
      [input.songId],
    );

    const existingVerses = existingVerseResult.rows.map((row) => ({
      id: row.id,
      lyricText: row.lyric_text,
    }));
    if (existingVerses.length === 0) {
      throw new InvalidSongVerseUpdateError("Song was not found.");
    }

    const plan = reconcileVersesForSongUpdate(existingVerses, nextVerses);
    const significantMatchedVerseCount = plan.matches.filter(
      (match) => match.score < SIGNIFICANT_MATCH_THRESHOLD,
    ).length;

    if (plan.removedVerseIds.length > 0) {
      await client.query(
        `
          DELETE FROM song_verses
          WHERE song_id = $1 AND id = ANY($2::uuid[])
        `,
        [input.songId, plan.removedVerseIds],
      );
    }

    await client.query(
      `
        UPDATE song_verses
        SET sequence_number = sequence_number + 1000
        WHERE song_id = $1
      `,
      [input.songId],
    );

    const matchedVerseIds = plan.matches.map(
      (match) => existingVerses[match.oldIndex]?.id ?? "",
    );
    const matchedSequenceNumbers = plan.matches.map(
      (match) => match.newIndex + 1,
    );
    const matchedLyricTexts = plan.matches.map(
      (match) => nextVerses[match.newIndex] ?? "",
    );

    if (matchedVerseIds.length > 0) {
      const matchedUpdateResult = await client.query<UpdatedVerseRow>(
        `
          UPDATE song_verses AS verse
          SET
            sequence_number = input.sequence_number,
            lyric_text = input.lyric_text,
            updated_at = NOW()
          FROM UNNEST($2::uuid[], $3::int[], $4::text[]) AS input(
            verse_id,
            sequence_number,
            lyric_text
          )
          WHERE verse.id = input.verse_id AND verse.song_id = $1
          RETURNING verse.id
        `,
        [
          input.songId,
          matchedVerseIds,
          matchedSequenceNumbers,
          matchedLyricTexts,
        ],
      );

      if (matchedUpdateResult.rows.length !== matchedVerseIds.length) {
        throw new InvalidSongVerseUpdateError(
          "Verse list is out of date. Reload and try again.",
        );
      }
    }

    const insertedSequenceNumbers = plan.newVerseIndexes.map(
      (newIndex) => newIndex + 1,
    );
    const insertedLyricTexts = plan.newVerseIndexes.map(
      (newIndex) => nextVerses[newIndex] ?? "",
    );
    let insertedVerseIds: string[] = [];
    if (insertedSequenceNumbers.length > 0) {
      const insertedResult = await client.query<InsertedVerseRow>(
        `
          INSERT INTO song_verses (
            id,
            song_id,
            sequence_number,
            lyric_text,
            illustration_url
          )
          SELECT
            gen_random_uuid(),
            $1,
            input.sequence_number,
            input.lyric_text,
            NULL
          FROM UNNEST($2::int[], $3::text[]) AS input(sequence_number, lyric_text)
          RETURNING id
        `,
        [input.songId, insertedSequenceNumbers, insertedLyricTexts],
      );
      insertedVerseIds = insertedResult.rows.map((row) => row.id);
    }

    if (insertedVerseIds.length > 0) {
      await client.query(
        `
          INSERT INTO song_generation_jobs (
            song_id,
            verse_id,
            status,
            attempts
          )
          SELECT
            $1,
            verse_id,
            'pending',
            0
          FROM UNNEST($2::uuid[]) AS input(verse_id)
          ON CONFLICT (verse_id) DO NOTHING
        `,
        [input.songId, insertedVerseIds],
      );
    }

    const shouldUnpublish =
      insertedSequenceNumbers.length > 0 || significantMatchedVerseCount > 0;
    let wasUnpublished = false;
    if (shouldUnpublish) {
      const unpublishResult = await client.query<{ id: string }>(
        `
          UPDATE songs
          SET
            is_published = false,
            updated_at = NOW()
          WHERE id = $1 AND is_published = true
          RETURNING id
        `,
        [input.songId],
      );
      wasUnpublished = (unpublishResult.rowCount ?? 0) > 0;
    }

    return {
      matchedVerseCount: plan.matches.length,
      significantMatchedVerseCount,
      insertedVerseCount: insertedSequenceNumbers.length,
      removedVerseCount: plan.removedVerseIds.length,
      wasUnpublished,
    };
  });
};
