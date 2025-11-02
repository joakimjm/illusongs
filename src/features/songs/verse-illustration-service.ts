import { mapSongVerseStoToDto } from "@/features/songs/song-mapping";
import type { SongVerseDto } from "@/features/songs/song-types";
import {
  SongVerseNotFoundError,
  updateVerseIllustrationUrl,
} from "@/features/songs/verse-illustration-commands";
import {
  convertIllustrationToWebp,
  InvalidVerseIllustrationError,
  VerseIllustrationProcessingError,
} from "@/features/songs/verse-illustration-processor";
import {
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

export const saveVerseIllustration = async (
  input: SaveVerseIllustrationInput,
): Promise<SongVerseDto> => {
  const webpImage = await convertIllustrationToWebp({
    imageData: input.imageData,
  });

  const { publicUrl } = await uploadVerseIllustrationImage({
    songId: input.songId,
    verseId: input.verseId,
    image: webpImage,
  });

  const verse = await updateVerseIllustrationUrl({
    songId: input.songId,
    verseId: input.verseId,
    illustrationUrl: publicUrl,
  });

  return mapSongVerseStoToDto(verse);
};
