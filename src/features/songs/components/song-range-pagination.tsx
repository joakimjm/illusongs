"use client";

import type { SongTitleRangeGroup } from "@/features/songs/song-title-range-grouping";
import type { SongSummaryDto } from "@/features/songs/song-types";

type SongRangePaginationProps = {
  readonly pages: SongTitleRangeGroup<SongSummaryDto>[];
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
};

export const SongRangePagination = ({
  pages,
  activeIndex,
  onSelect,
}: SongRangePaginationProps) => {
  if (pages.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Song title ranges"
      className="mt-4 flex flex-wrap items-center justify-center gap-2"
    >
      {pages.map((group, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={`${group.label}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold transition ${
              isActive
                ? "border-amber-400 bg-amber-200/30 text-amber-900 dark:border-amber-300 dark:bg-amber-200/20 dark:text-amber-100"
                : "border-amber-200/60 bg-amber-50 text-stone-600 hover:border-amber-300 hover:text-amber-800 dark:border-slate-600/60 dark:bg-slate-900/70 dark:text-stone-300 dark:hover:text-amber-100"
            }`}
            aria-pressed={isActive}
          >
            {group.label}
          </button>
        );
      })}
    </nav>
  );
};
