import type { TagCategoryDto } from "@/features/songs/song-tag-categories";
import type { SongSummaryDto } from "@/features/songs/song-types";

const SEASON_TAG_PREFIX = "season:";

type SupportedSeasonKey = "christmas";

type SeasonDisplayOptionConfig = {
  readonly key: SupportedSeasonKey;
  readonly tag: `${typeof SEASON_TAG_PREFIX}${SupportedSeasonKey}`;
  readonly label: string;
  readonly hideLabel: string;
};

export type SeasonDisplayOption = SeasonDisplayOptionConfig & {
  readonly songCount: number;
};

const SEASON_DISPLAY_OPTIONS: readonly SeasonDisplayOptionConfig[] = [
  {
    key: "christmas",
    tag: "season:christmas",
    label: "Julesange",
    hideLabel: "Skjul julesange",
  },
] as const;

export const isSeasonTag = (tag: string): boolean =>
  tag.trim().toLowerCase().startsWith(SEASON_TAG_PREFIX);

export const removeSeasonTagsFromCategories = (
  categories: readonly TagCategoryDto[],
): TagCategoryDto[] =>
  categories
    .map((category) => ({
      ...category,
      tags: category.tags.filter((tag) => !isSeasonTag(tag.id)),
    }))
    .filter((category) => category.tags.length > 0);

export const getAvailableSeasonDisplayOptions = (
  songs: readonly SongSummaryDto[],
): SeasonDisplayOption[] =>
  SEASON_DISPLAY_OPTIONS.flatMap((option) => {
    const songCount = songs.filter((song) =>
      song.tags.includes(option.tag),
    ).length;

    return songCount > 0 ? [{ ...option, songCount }] : [];
  });

export const songMatchesSeasonKey = (
  song: SongSummaryDto,
  seasonKey: string,
): boolean => {
  const seasonOption = SEASON_DISPLAY_OPTIONS.find(
    (option) => option.key === seasonKey,
  );

  return seasonOption ? song.tags.includes(seasonOption.tag) : false;
};
