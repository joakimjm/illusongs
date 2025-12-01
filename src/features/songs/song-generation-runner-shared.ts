import type { Buffer } from "node:buffer";
import type { SongDetailDto, SongVerseDto } from "@/features/songs/song-types";

export const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(buffer);
  return arrayBuffer;
};

export const getSortedPreviousVerses = (
  song: SongDetailDto,
  currentVerse: SongVerseDto,
): SongVerseDto[] =>
  song.verses
    .filter((entry) => entry.sequenceNumber < currentVerse.sequenceNumber)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
