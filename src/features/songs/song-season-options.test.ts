import { describe, expect, test } from "vitest";
import type { TagCategoryDto } from "@/features/songs/song-tag-categories";
import type { SongSummaryDto } from "@/features/songs/song-types";
import {
  getAvailableSeasonDisplayOptions,
  isSeasonTag,
  removeSeasonTagsFromCategories,
  songMatchesSeasonKey,
} from "./song-season-options";

const buildSong = (
  id: string,
  title: string,
  tags: string[],
): SongSummaryDto => ({
  id,
  slug: id,
  title,
  languageCode: "da",
  coverImageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  tags,
});

describe("isSeasonTag", () => {
  test("detects season tags by prefix", () => {
    expect(isSeasonTag("season:christmas")).toBe(true);
    expect(isSeasonTag("character:nisse")).toBe(false);
  });
});

describe("removeSeasonTagsFromCategories", () => {
  test("removes season tags and drops empty categories", () => {
    const categories: TagCategoryDto[] = [
      {
        id: "season",
        label: "Season",
        tags: [
          { id: "season:christmas", label: "Christmas" },
          { id: "season:easter", label: "Easter" },
        ],
      },
      {
        id: "theme",
        label: "Tema",
        tags: [
          { id: "dyr", label: "Dyr" },
          { id: "venskab", label: "Venskab" },
        ],
      },
    ];

    expect(removeSeasonTagsFromCategories(categories)).toEqual([
      {
        id: "theme",
        label: "Tema",
        tags: [
          { id: "dyr", label: "Dyr" },
          { id: "venskab", label: "Venskab" },
        ],
      },
    ]);
  });
});

describe("getAvailableSeasonDisplayOptions", () => {
  test("returns supported seasons present in the songbook", () => {
    const songs = [
      buildSong("a", "Bjældeklang", ["season:christmas", "vinter"]),
      buildSong("b", "Sommersang", ["sommer"]),
    ];

    expect(getAvailableSeasonDisplayOptions(songs)).toEqual([
      {
        key: "christmas",
        tag: "season:christmas",
        label: "Julesange",
        hideLabel: "Skjul julesange",
        songCount: 1,
      },
    ]);
  });
});

describe("songMatchesSeasonKey", () => {
  test("matches supported season keys only", () => {
    const christmasSong = buildSong("a", "Julesang", ["season:christmas"]);
    const neutralSong = buildSong("b", "Hverdagsang", ["dyr"]);

    expect(songMatchesSeasonKey(christmasSong, "christmas")).toBe(true);
    expect(songMatchesSeasonKey(neutralSong, "christmas")).toBe(false);
    expect(songMatchesSeasonKey(christmasSong, "easter")).toBe(false);
  });
});
