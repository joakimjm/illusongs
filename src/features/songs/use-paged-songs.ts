"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  groupSongsByTitleRange,
  type SongTitleRangeGroup,
} from "@/features/songs/song-title-range-grouping";
import type { SongSummaryDto } from "@/features/songs/song-types";

const PAGE_QUERY_PARAM = "pageIndex";

type UsePagedSongsResult = {
  readonly currentPage: SongTitleRangeGroup<SongSummaryDto> | null;
  readonly pages: SongTitleRangeGroup<SongSummaryDto>[];
  readonly setPageIndex: (index: number) => void;
};

const parsePageIndex = (raw: string | null): number => {
  if (raw === null) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildNextUrl = (pathname: string, params: URLSearchParams): string => {
  const search = params.toString();
  return search.length > 0 ? `${pathname}?${search}` : pathname;
};

export const usePagedSongs = (
  songs: readonly SongSummaryDto[],
): UsePagedSongsResult => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pages = useMemo(
    () => groupSongsByTitleRange<SongSummaryDto>({ songs }),
    [songs],
  );

  const pagesCount = pages.length;
  const requestedIndex = parsePageIndex(searchParams.get(PAGE_QUERY_PARAM));
  const normalizedIndex =
    pagesCount > 0 ? Math.min(Math.max(requestedIndex, 0), pagesCount - 1) : 0;

  useEffect(() => {
    if (pagesCount === 0) {
      if (searchParams.get(PAGE_QUERY_PARAM) !== null) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete(PAGE_QUERY_PARAM);
        router.replace(buildNextUrl(pathname, nextParams) as Route, {
          scroll: false,
        });
      }
      return;
    }

    const currentParam = searchParams.get(PAGE_QUERY_PARAM);
    if (currentParam === String(normalizedIndex)) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set(PAGE_QUERY_PARAM, String(normalizedIndex));
    router.replace(buildNextUrl(pathname, nextParams) as Route, {
      scroll: false,
    });
  }, [normalizedIndex, pagesCount, pathname, router, searchParams]);

  const setPageIndex = useCallback(
    (index: number) => {
      if (pagesCount === 0) {
        return;
      }

      const clamped = Math.min(Math.max(index, 0), pagesCount - 1);
      const currentParam = searchParams.get(PAGE_QUERY_PARAM);

      if (currentParam === String(clamped)) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(PAGE_QUERY_PARAM, String(clamped));
      router.push(buildNextUrl(pathname, nextParams) as Route, {
        scroll: false,
      });
    },
    [pagesCount, pathname, router, searchParams],
  );

  const currentPage = pagesCount > 0 ? (pages[normalizedIndex] ?? null) : null;

  return {
    currentPage,
    pages,
    setPageIndex,
  };
};
