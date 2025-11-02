import { NextResponse } from "next/server";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createBadRequestResponse,
  createConflictResponse,
  createForbiddenResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import { createSong } from "@/features/songs/song-commands";
import { fetchPublishedSongs } from "@/features/songs/song-queries";
import type { CreateSongInput } from "@/features/songs/song-types";
import { isRecord } from "@/utils";
import { SONGS_MANAGED_BY_ADMINS_DETAIL } from "./songs.constants";

export class InvalidSongRequestError extends Error {}

type CreateSongPayload = {
  id?: string;
  slug?: string;
  title: string;
  languageCode?: string;
  isPublished?: boolean;
  tags?: string[];
  verses: Array<{
    id?: number;
    sequenceNumber?: number;
    text: string;
    illustration?: string | null;
  }>;
};

const normalizeSlug = (value: string | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.toLowerCase();
};

const mapVersePayload = (
  verse: CreateSongPayload["verses"][number],
  index: number,
) => {
  const sequenceCandidate =
    typeof verse.sequenceNumber === "number"
      ? verse.sequenceNumber
      : typeof verse.id === "number"
        ? verse.id
        : null;

  if (sequenceCandidate === null || !Number.isInteger(sequenceCandidate)) {
    throw new InvalidSongRequestError(
      `Verse at index ${index} is missing a valid sequence number.`,
    );
  }

  if (sequenceCandidate <= 0) {
    throw new InvalidSongRequestError(
      `Verse at index ${index} must have a sequence number greater than zero.`,
    );
  }

  if (typeof verse.text !== "string" || verse.text.trim().length === 0) {
    throw new InvalidSongRequestError(
      `Verse at index ${index} must include lyric text.`,
    );
  }

  const illustration =
    verse.illustration === undefined || verse.illustration === null
      ? null
      : typeof verse.illustration === "string"
        ? verse.illustration.trim()
        : null;

  if (illustration !== null && illustration.length === 0) {
    throw new InvalidSongRequestError(
      `Verse at index ${index} has an invalid illustration url.`,
    );
  }

  return {
    sequenceNumber: sequenceCandidate,
    lyricText: verse.text,
    illustrationUrl: illustration,
  };
};

export const parseCreateSongPayload = (
  payload: unknown,
): CreateSongInput => {
  if (!isRecord(payload)) {
    throw new InvalidSongRequestError("Payload must be a JSON object.");
  }

  const candidatePayload = payload as CreateSongPayload;

  const slug =
    normalizeSlug(candidatePayload.slug) ??
    normalizeSlug(candidatePayload.id ?? undefined);

  if (!slug) {
    throw new InvalidSongRequestError("Song slug is required.");
  }

  if (typeof candidatePayload.title !== "string") {
    throw new InvalidSongRequestError("Song title is required.");
  }

  const title = candidatePayload.title.trim();
  if (title.length === 0) {
    throw new InvalidSongRequestError("Song title is required.");
  }

  if (!Array.isArray(candidatePayload.verses)) {
    throw new InvalidSongRequestError("Song verses must be provided.");
  }

  if (candidatePayload.verses.length === 0) {
    throw new InvalidSongRequestError("Song requires at least one verse.");
  }

  const verses = candidatePayload.verses.map(mapVersePayload);

  const sequenceSet = new Set<number>();
  verses.forEach((verse) => {
    if (sequenceSet.has(verse.sequenceNumber)) {
      throw new InvalidSongRequestError(
        "Verses must have unique sequence numbers.",
      );
    }
    sequenceSet.add(verse.sequenceNumber);
  });

  const languageCode =
    typeof candidatePayload.languageCode === "string" &&
    candidatePayload.languageCode.trim().length > 0
      ? candidatePayload.languageCode.trim()
      : "da";

  const isPublished =
    candidatePayload.isPublished === undefined
      ? true
      : Boolean(candidatePayload.isPublished);

  const tags = Array.isArray(candidatePayload.tags)
    ? Array.from(
        new Set(
          candidatePayload.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .map((tag) => tag.toLowerCase()),
        ),
      )
    : [];

  const songInput: CreateSongInput = {
    slug,
    title,
    languageCode,
    isPublished,
    tags,
    verses,
  };

  return songInput;
};

export const GET = async (): Promise<Response> => {
  try {
    const songs = await fetchPublishedSongs();
    return NextResponse.json({ songs });
  } catch (error) {
    return logAndRespondWithError(
      "songs_fetch_failed",
      error,
      "Unable to fetch songs",
    );
  }
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

const handlers = createApiRoute({
  POST: async ({ request, identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(SONGS_MANAGED_BY_ADMINS_DETAIL);
    }

    try {
      const payload = parseCreateSongPayload(await request.json());
      const song = await createSong(payload);
      return NextResponse.json({ song });
    } catch (error) {
      if (error instanceof InvalidSongRequestError) {
        return createBadRequestResponse(error.message);
      }

      if (isUniqueViolation(error)) {
        return createConflictResponse(
          "A song with the provided slug already exists.",
        );
      }

      return logAndRespondWithError(
        "song_create_failed",
        error,
        "Unable to create song",
      );
    }
  },
});

export const POST = handlers.POST;
