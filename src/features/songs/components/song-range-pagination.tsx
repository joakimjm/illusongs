"use client";

import { useState } from "react";
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
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

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
        const isPending = pendingIndex === index && !isActive;
        return (
          <button
            key={`${group.label}-${index}`}
            type="button"
            onClick={() => {
              setPendingIndex(index);
              onSelect(index);
            }}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold transition ${
              isActive
                ? "border-amber-400 bg-amber-200/30 text-amber-900 dark:border-amber-300 dark:bg-amber-200/20 dark:text-amber-100"
                : isPending
                  ? "scale-[0.98] border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-300 dark:bg-slate-800 dark:text-amber-100"
                  : "border-amber-200/60 bg-amber-50 text-stone-600 hover:border-amber-300 hover:text-amber-800 dark:border-slate-600/60 dark:bg-slate-900/70 dark:text-stone-300 dark:hover:text-amber-100"
            }`}
            aria-pressed={isActive}
            aria-busy={isPending}
          >
            {group.label}
          </button>
        );
      })}
    </nav>
  );
};
