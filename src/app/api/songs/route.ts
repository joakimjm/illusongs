import { NextResponse } from "next/server";
import { fetchPublishedSongs } from "@/features/songs/song-queries";
import { logAndRespondWithError } from "@/features/http/api-utils";

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
