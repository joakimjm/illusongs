import { mapSongVerseStoToDto } from "@/features/songs/song-mapping";
import type { SongVerseDto } from "@/features/songs/song-types";
import {
  SongVerseNotFoundError,
  updateVerseIllustrationUrl,
} from "@/features/songs/verse-illustration-commands";
import {
  convertIllustrationToWebp,
  createIllustrationThumbnail,
  InvalidVerseIllustrationError,
  VerseIllustrationProcessingError,
} from "@/features/songs/verse-illustration-processor";
import {
  deleteVerseIllustrationImage,
  uploadVerseIllustrationImage,
  VerseIllustrationUploadError,
} from "@/features/songs/verse-illustration-storage";

export {
  InvalidVerseIllustrationError,
  VerseIllustrationProcessingError,
  VerseIllustrationUploadError,
  SongVerseNotFoundError,
};

type SaveVerseIllustrationInput = {
  songId: string;
  verseId: string;
  imageData: ArrayBuffer;
};

export type SaveVerseIllustrationResult = {
  verse: SongVerseDto;
  storagePath: string;
  thumbnailPath: string | null;
};

export const saveVerseIllustration = async (
  input: SaveVerseIllustrationInput,
): Promise<SaveVerseIllustrationResult> => {
  const webpImage = await convertIllustrationToWebp({
    imageData: input.imageData,
  });

  const thumbnailImage = await createIllustrationThumbnail({
    imageData: input.imageData,
  });

  const mainUpload = await uploadVerseIllustrationImage({
    songId: input.songId,
    verseId: input.verseId,
    image: webpImage,
    variant: "main",
  });

  let thumbnailUpload: { publicUrl: string; path: string } | null = null;

  try {
    thumbnailUpload = await uploadVerseIllustrationImage({
      songId: input.songId,
      verseId: input.verseId,
      image: thumbnailImage,
      variant: "thumbnail",
    });
  } catch (error) {
    await deleteVerseIllustrationImage(mainUpload.path).catch(() => {
      // best-effort cleanup; original error is thrown below
    });
    throw error;
  }

  const verse = await updateVerseIllustrationUrl({
    songId: input.songId,
    verseId: input.verseId,
    illustrationUrl: mainUpload.publicUrl,
  });

  return {
    verse: mapSongVerseStoToDto(verse),
    storagePath: mainUpload.path,
    thumbnailPath: thumbnailUpload?.path ?? null,
  };
};
