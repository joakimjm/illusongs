import { NextResponse } from "next/server";
import { SONGS_MANAGED_BY_ADMINS_DETAIL } from "@/app/api/songs/songs.constants";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createForbiddenResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import { processNextSongGenerationJob } from "@/features/songs/song-generation-runner";

export const runtime = "nodejs";

const handlers = createApiRoute({
  POST: async ({ identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(SONGS_MANAGED_BY_ADMINS_DETAIL);
    }

    try {
      const result = await processNextSongGenerationJob();

      if (!result) {
        return new Response(null, { status: 204 });
      }

      return NextResponse.json(result);
    } catch (error) {
      return logAndRespondWithError(
        "song_generation_dispatch_failed",
        error,
        "Unable to process song generation job",
      );
    }
  },
});

export const POST = handlers.POST;
