import { NextResponse } from "next/server";
import { SONGS_MANAGED_BY_ADMINS_DETAIL } from "@/app/api/songs/songs.constants";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createBadRequestResponse,
  createForbiddenResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import {
  createSongDraft,
  InvalidSongDraftError,
} from "@/features/songs/song-admin-commands";
import { isRecord } from "@/utils";

type CreateSongDraftPayload = {
  title: string;
  verses: string;
  tags?: string[];
  languageCode?: string;
};

export class InvalidSongDraftRequestError extends Error {}

export const parseCreateSongDraftPayload = (
  payload: unknown,
): CreateSongDraftPayload => {
  if (!isRecord(payload)) {
    throw new InvalidSongDraftRequestError("Payload must be a JSON object.");
  }

  const titleValue = payload.title;
  const versesValue = payload.verses;

  if (typeof titleValue !== "string" || titleValue.trim().length === 0) {
    throw new InvalidSongDraftRequestError("Song title is required.");
  }

  if (typeof versesValue !== "string" || versesValue.trim().length === 0) {
    throw new InvalidSongDraftRequestError("Song verses text is required.");
  }

  const tagsValue = payload.tags;
  const tags =
    Array.isArray(tagsValue) &&
    tagsValue.every((tag) => typeof tag === "string")
      ? (tagsValue as string[])
      : [];

  const languageCode =
    typeof payload.languageCode === "string" &&
    payload.languageCode.trim().length > 0
      ? payload.languageCode.trim()
      : undefined;

  return {
    title: titleValue.trim(),
    verses: versesValue,
    tags,
    languageCode,
  };
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
      const payload = parseCreateSongDraftPayload(await request.json());
      const song = await createSongDraft({
        title: payload.title,
        versesText: payload.verses,
        languageCode: payload.languageCode,
        tags: payload.tags,
      });

      return NextResponse.json({ song }, { status: 201 });
    } catch (error) {
      if (
        error instanceof InvalidSongDraftRequestError ||
        error instanceof InvalidSongDraftError
      ) {
        return createBadRequestResponse(error.message);
      }

      if (isUniqueViolation(error)) {
        return createBadRequestResponse(
          "A song with the generated slug already exists.",
        );
      }

      return logAndRespondWithError(
        "song_draft_create_failed",
        error,
        "Unable to create song draft",
      );
    }
  },
});

export const POST = handlers.POST;
