"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SongSummaryDto } from "@/features/songs/song-types";

const normalizeTagId = (value: string): string => value.trim().toLowerCase();

const filterSongsByQueryAndTags = (
  songs: readonly SongSummaryDto[],
  query: string,
  selectedTags: readonly string[],
): SongSummaryDto[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const hasTags = selectedTags.length > 0;

  if (!hasQuery && !hasTags) {
    return [...songs];
  }

  return songs.filter((song) => {
    const matchesTags = hasTags
      ? selectedTags.every((tag) => song.tags.includes(tag))
      : true;

    const matchesQuery = hasQuery
      ? song.title.toLowerCase().includes(normalizedQuery) ||
        song.tags.some((tag) => tag.includes(normalizedQuery))
      : true;

    return matchesTags && matchesQuery;
  });
};

const buildNextUrl = (pathname: string, params: URLSearchParams): string => {
  const search = params.toString();
  return search.length > 0 ? `${pathname}?${search}` : pathname;
};

type UseTagFilterOptions = {
  readonly songs: readonly SongSummaryDto[];
  readonly initialQuery: string;
  readonly initialTags: readonly string[];
};

type UseTagFilterResult = {
  readonly query: string;
  readonly setQuery: (value: string) => void;
  readonly selectedTags: readonly string[];
  readonly toggleTag: (tag: string) => void;
  readonly removeTag: (tag: string) => void;
  readonly clearFilters: () => void;
  readonly filteredSongs: readonly SongSummaryDto[];
  readonly isHydrated: boolean;
};

export const useTagFilter = ({
  songs,
  initialQuery,
  initialTags,
}: UseTagFilterOptions): UseTagFilterResult => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState<readonly string[]>(() =>
    Array.from(new Set(initialTags.map(normalizeTagId))),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);

    if (initialQuery.length > 0 || initialTags.length > 0) {
      return;
    }

    const paramsQuery = searchParams.get("q");
    const paramsTags =
      searchParams.get("tags")?.split(",").map(normalizeTagId) ?? [];

    if (paramsQuery !== null || paramsTags.length > 0) {
      setQuery(paramsQuery ?? "");
      setSelectedTags(paramsTags);
    }
  }, [initialQuery, initialTags, searchParams]);

  const toggleTag = useCallback((tag: string) => {
    const normalized = normalizeTagId(tag);
    setSelectedTags((current) => {
      const hasTag = current.includes(normalized);
      return hasTag
        ? current.filter((entry) => entry !== normalized)
        : [...current, normalized];
    });
  }, []);

  const removeTag = useCallback((tag: string) => {
    const normalized = normalizeTagId(tag);
    setSelectedTags((current) =>
      current.filter((entry) => entry !== normalized),
    );
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedTags([]);
  }, []);

  const filteredSongs = useMemo(
    () => filterSongsByQueryAndTags(songs, query, selectedTags),
    [songs, query, selectedTags],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const trimmedQuery = query.trim();
    const nextParams = new URLSearchParams(searchParams.toString());

    if (trimmedQuery.length > 0) {
      nextParams.set("q", trimmedQuery);
    } else {
      nextParams.delete("q");
    }

    if (selectedTags.length > 0) {
      nextParams.set("tags", selectedTags.join(","));
    } else {
      nextParams.delete("tags");
    }

    const nextUrl = buildNextUrl(pathname, nextParams);
    const currentUrl =
      pathname +
      (searchParams.toString().length > 0 ? `?${searchParams.toString()}` : "");

    if (
      typeof window !== "undefined" &&
      nextUrl !== currentUrl &&
      previousUrlRef.current !== nextUrl
    ) {
      window.history.replaceState(null, "", nextUrl);
      previousUrlRef.current = nextUrl;
    }
  }, [isHydrated, pathname, query, searchParams, selectedTags]);

  return {
    query,
    setQuery,
    selectedTags,
    toggleTag,
    removeTag,
    clearFilters,
    filteredSongs,
    isHydrated,
  };
};
