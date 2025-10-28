"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SongFilters, { type SongFiltersValue } from "@/components/song-filters";
import SongList from "@/components/song-list";
import type { Song } from "@/data/songs";

export type SongBrowserProps = {
  readonly songs: ReadonlyArray<Song>;
};

const normalise = (value: string): string => value.toLocaleLowerCase("da");

const matchesText = (song: Song, text: string): boolean => {
  if (text.length === 0) {
    return true;
  }
  const needle = normalise(text);
  if (normalise(song.title).includes(needle)) {
    return true;
  }
  return song.verses.some((v) => normalise(v.text).includes(needle));
};

const matchesTags = (
  song: Song,
  selectedTags: ReadonlyArray<string>,
): boolean => {
  if (selectedTags.length === 0) {
    return true;
  }
  // All selected tags must be present (AND semantics). Adjust to OR if desired.
  return selectedTags.every((t) => song.tags.includes(t));
};

const filterSongs = (
  songs: ReadonlyArray<Song>,
  value: SongFiltersValue,
): ReadonlyArray<Song> => {
  return songs.filter(
    (song) => matchesText(song, value.text) && matchesTags(song, value.tags),
  );
};

const SongBrowser = ({ songs }: SongBrowserProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initial state hydrated from URL
  const initialText = searchParams.get("q") ?? "";
  const initialTagsParam = searchParams.get("tags") ?? "";
  const initialTags = initialTagsParam
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  const [filters, setFilters] = useState<SongFiltersValue>(() => ({
    text: initialText,
    tags: initialTags,
  }));
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => filterSongs(songs, filters), [songs, filters]);

  // Persist filters to URL (replace to avoid history spam)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.text.length > 0) {
      params.set("q", filters.text);
    }
    if (filters.tags.length > 0) {
      params.set("tags", filters.tags.join(","));
    }
    const qs = params.toString();
    router.replace(qs.length === 0 ? "?" : `?${qs}`);
  }, [filters.text, filters.tags, router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-amber-600 bg-amber-600/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          aria-expanded={open}
          aria-controls="song-filters-panel"
        >
          {open ? "Skjul søgning" : "Søg & filtrer"}
        </button>
        {filters.tags.length > 0 || filters.text.length > 0 ? (
          <button
            type="button"
            onClick={() => setFilters({ text: "", tags: [] })}
            className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
          >
            Nulstil alt
          </button>
        ) : null}
      </div>
      {open && (
        <div id="song-filters-panel">
          <SongFilters value={filters} onChange={setFilters} songs={songs} />
        </div>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            {filtered.length} / {songs.length} sange
          </h2>
          {filters.text.length > 0 && (
            <button
              type="button"
              onClick={() => setFilters({ text: "", tags: filters.tags })}
              className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
            >
              Ryd søgning
            </button>
          )}
        </div>
        <SongList songs={filtered} />
        {filtered.length === 0 && (
          <p className="rounded-3xl bg-white/70 p-6 text-sm text-slate-600">
            Ingen sange matcher dine filtre.
          </p>
        )}
      </div>
    </div>
  );
};

export default SongBrowser;
