import { getPostgresConnection } from "@/features/postgres/postgres-connection-pool";
import { createSongWithClient } from "@/features/songs/song-commands";
import { enqueueSongGenerationJobs } from "@/features/songs/song-generation-queue";
import type { SongDetailDto } from "@/features/songs/song-types";

export class InvalidSongDraftError extends Error {}

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

type CreateSongDraftInput = {
  title: string;
  versesText: string;
  languageCode?: string;
  tags?: string[];
};

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
