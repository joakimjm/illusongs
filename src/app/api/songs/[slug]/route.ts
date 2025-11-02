import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createNotFoundResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import { findSongBySlug } from "@/features/songs/song-queries";

export class InvalidSongSlugError extends Error {}

export const normalizeSongSlugParam = (slug: string | undefined): string => {
  if (typeof slug !== "string") {
    throw new InvalidSongSlugError("Song slug must be provided.");
  }

  const trimmed = slug.trim();
  if (trimmed.length === 0) {
    throw new InvalidSongSlugError("Song slug must be provided.");
  }

  return trimmed.toLowerCase();
};

type SongRouteContext = {
  params: {
    slug: string;
  };
};

export const GET = async (
  _request: NextRequest,
  context: SongRouteContext,
): Promise<Response> => {
  try {
    const normalizedSlug = normalizeSongSlugParam(context.params.slug);
    const song = await findSongBySlug(normalizedSlug);

    if (!song || !song.isPublished) {
      return createNotFoundResponse("Song not found.");
    }

    return NextResponse.json({ song });
  } catch (error) {
    if (error instanceof InvalidSongSlugError) {
      return createNotFoundResponse("Song not found.");
    }

    return logAndRespondWithError(
      "song_fetch_failed",
      error,
      "Unable to fetch song",
    );
  }
};
