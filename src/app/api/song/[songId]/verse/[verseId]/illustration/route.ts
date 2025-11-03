import { NextResponse } from "next/server";
import { SONGS_MANAGED_BY_ADMINS_DETAIL } from "@/app/api/songs/songs.constants";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createBadRequestResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import {
  InvalidVerseIllustrationError,
  SongVerseNotFoundError,
  saveVerseIllustration,
  VerseIllustrationProcessingError,
  VerseIllustrationUploadError,
} from "@/features/songs/verse-illustration-service";
import { isValidUuid } from "@/utils";

export const runtime = "nodejs";
export class InvalidVerseIllustrationRequestError extends Error {}

const FILE_FIELD_NAME = "file";

export const normalizeUuidParam = (
  value: string | undefined,
  paramName: string,
): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidVerseIllustrationRequestError(
      `${paramName} must be provided.`,
    );
  }

  const candidate = value.trim().toLowerCase();
  if (!isValidUuid(candidate)) {
    throw new InvalidVerseIllustrationRequestError(
      `${paramName} must be a valid UUID.`,
    );
  }

  return candidate;
};

const extractIllustrationData = async (
  request: Request,
): Promise<ArrayBuffer> => {
  const formData = await request.formData();
  const fileEntry = formData.get(FILE_FIELD_NAME);

  if (!(fileEntry instanceof File)) {
    throw new InvalidVerseIllustrationRequestError(
      "An illustration file is required.",
    );
  }

  if (fileEntry.size === 0) {
    throw new InvalidVerseIllustrationRequestError(
      "Illustration file cannot be empty.",
    );
  }

  if (!fileEntry.type || !fileEntry.type.startsWith("image/")) {
    throw new InvalidVerseIllustrationRequestError(
      "Only image uploads are allowed.",
    );
  }

  return await fileEntry.arrayBuffer();
};

const handlers = createApiRoute<{ songId: string; verseId: string }>({
  POST: async ({ request, identity, params }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(SONGS_MANAGED_BY_ADMINS_DETAIL);
    }

    try {
      const songId = normalizeUuidParam(params.songId, "Song id");
      const verseId = normalizeUuidParam(params.verseId, "Verse id");
      const imageData = await extractIllustrationData(request);

      const verse = await saveVerseIllustration({
        songId,
        verseId,
        imageData,
      });

      return NextResponse.json({ verse });
    } catch (error) {
      if (error instanceof InvalidVerseIllustrationRequestError) {
        return createBadRequestResponse(error.message);
      }

      if (error instanceof InvalidVerseIllustrationError) {
        return createBadRequestResponse("Uploaded file is not a valid image.");
      }

      if (error instanceof SongVerseNotFoundError) {
        return createNotFoundResponse("Song verse not found.");
      }

      if (
        error instanceof VerseIllustrationProcessingError ||
        error instanceof VerseIllustrationUploadError
      ) {
        return logAndRespondWithError(
          "verse_illustration_store_failed",
          error,
          "Unable to store verse illustration",
        );
      }

      return logAndRespondWithError(
        "verse_illustration_unexpected_failure",
        error,
        "Unable to process verse illustration",
      );
    }
  },
});

export const POST = handlers.POST;
