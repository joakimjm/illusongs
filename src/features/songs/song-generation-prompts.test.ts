import { expect, test } from "vitest";
import {
  createInitialSongIllustrationPrompt,
  createNextVerseIllustrationPrompt,
} from "@/features/songs/song-generation-prompts";
import type { SongDetailDto } from "@/features/songs/song-types";

const sampleSong: SongDetailDto = {
  id: "song-1",
  slug: "sample-song",
  title: "Sample Song",
  languageCode: "da",
  isPublished: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  coverImageUrl: null,
  tags: [],
  verses: [
    {
      id: "verse-1",
      sequenceNumber: 1,
      lyricText: "Vers 1 linje 1\nVers 1 linje 2",
      illustrationUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "verse-2",
      sequenceNumber: 2,
      lyricText: "Vers 2 linje 1",
      illustrationUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
} as const;

test("createInitialSongIllustrationPrompt includes song context and first verse", () => {
  const prompt = createInitialSongIllustrationPrompt(sampleSong);

  expect(prompt).toContain("Her er en sang:");
  expect(prompt).toContain(sampleSong.title);
  expect(prompt).toContain(sampleSong.verses[0]?.lyricText ?? "");
  expect(prompt).toContain("Illustrerer med følgende stil");
});

test("createNextVerseIllustrationPrompt formats follow-up prompt", () => {
  const prompt = createNextVerseIllustrationPrompt(sampleSong.verses[1]);

  expect(prompt.startsWith("Illustrer næste vers i samme stil")).toBe(true);
  expect(prompt).toContain(sampleSong.verses[1]?.lyricText ?? "");
});
