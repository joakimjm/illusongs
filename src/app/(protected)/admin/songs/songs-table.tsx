"use client";

import Link from "next/link";
import { type JSX, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { FormField } from "@/components/form/field";
import { Body } from "@/components/typography";
import type { AdminSongSummary } from "@/features/songs/song-admin-queries";

type SongSort =
  | "title_asc"
  | "title_desc"
  | "status"
  | "verses_desc"
  | "verses_asc"
  | "queued_desc"
  | "queued_asc";

const SONG_SORT_LABELS: Record<SongSort, string> = {
  title_asc: "Title (A-Z)",
  title_desc: "Title (Z-A)",
  status: "Status",
  verses_desc: "Verses (most first)",
  verses_asc: "Verses (fewest first)",
  queued_desc: "Queued (most first)",
  queued_asc: "Queued (fewest first)",
};

const isSongSort = (value: string): value is SongSort => {
  switch (value) {
    case "title_asc":
    case "title_desc":
    case "status":
    case "verses_desc":
    case "verses_asc":
    case "queued_desc":
    case "queued_asc":
      return true;
    default:
      return false;
  }
};

const sortSongs = (
  songs: readonly AdminSongSummary[],
  sortBy: SongSort,
): AdminSongSummary[] => {
  return [...songs].sort((a, b) => {
    switch (sortBy) {
      case "title_asc":
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      case "title_desc":
        return b.title.localeCompare(a.title, undefined, {
          sensitivity: "base",
        });
      case "status": {
        const leftStatusOrder = a.isPublished ? 0 : 1;
        const rightStatusOrder = b.isPublished ? 0 : 1;
        return (
          leftStatusOrder - rightStatusOrder ||
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
      }
      case "verses_desc":
        return b.verseCount - a.verseCount;
      case "verses_asc":
        return a.verseCount - b.verseCount;
      case "queued_desc":
        return b.pendingJobs - a.pendingJobs;
      case "queued_asc":
        return a.pendingJobs - b.pendingJobs;
      default:
        return 0;
    }
  });
};

type SongsTableProps = {
  readonly songs: readonly AdminSongSummary[];
  readonly onTogglePublish: (formData: FormData) => Promise<void>;
};

const DEFAULT_SORT: SongSort = "title_asc";

export const SongsTable = ({
  songs,
  onTogglePublish,
}: SongsTableProps): JSX.Element => {
  const [draftSearchText, setDraftSearchText] = useState("");
  const [draftHidePublished, setDraftHidePublished] = useState(false);
  const [draftSortBy, setDraftSortBy] = useState<SongSort>(DEFAULT_SORT);
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [appliedHidePublished, setAppliedHidePublished] = useState(false);
  const [appliedSortBy, setAppliedSortBy] = useState<SongSort>(DEFAULT_SORT);

  const filteredSongs = useMemo(() => {
    const normalizedSearch = appliedSearchText.trim().toLowerCase();

    return songs.filter((song) => {
      if (appliedHidePublished && song.isPublished) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const titleMatches = song.title.toLowerCase().includes(normalizedSearch);
      const slugMatches = song.slug.toLowerCase().includes(normalizedSearch);

      return titleMatches || slugMatches;
    });
  }, [songs, appliedSearchText, appliedHidePublished]);

  const sortedSongs = useMemo(
    () => sortSongs(filteredSongs, appliedSortBy),
    [filteredSongs, appliedSortBy],
  );

  const applyFilters = () => {
    setAppliedSearchText(draftSearchText);
    setAppliedHidePublished(draftHidePublished);
    setAppliedSortBy(draftSortBy);
  };

  const resetFilters = () => {
    setDraftSearchText("");
    setDraftHidePublished(false);
    setDraftSortBy(DEFAULT_SORT);
    setAppliedSearchText("");
    setAppliedHidePublished(false);
    setAppliedSortBy(DEFAULT_SORT);
  };

  return (
    <>
      <form
        className="mb-5 flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <FormField
          label="Search title or slug"
          htmlFor="song-search"
          className="min-w-64 flex-1"
        >
          <input
            id="song-search"
            name="q"
            type="search"
            value={draftSearchText}
            onChange={(event) => setDraftSearchText(event.target.value)}
            placeholder="e.g. lullaby or jens-hansen"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-100"
          />
        </FormField>

        <FormField label="Visibility" htmlFor="song-hide-published">
          <label className="flex h-10 items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
            <input
              id="song-hide-published"
              type="checkbox"
              checked={draftHidePublished}
              onChange={(event) => setDraftHidePublished(event.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            />
            Hide published songs
          </label>
        </FormField>

        <FormField label="Sort by" htmlFor="song-sort" className="min-w-56">
          <select
            id="song-sort"
            name="sort"
            value={draftSortBy}
            onChange={(event) => {
              const nextSort = event.target.value;
              if (isSongSort(nextSort)) {
                setDraftSortBy(nextSort);
              }
            }}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-100"
          >
            {Object.entries(SONG_SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex min-w-fit flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
            Actions
          </span>
          <div className="flex h-10 items-center gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Apply filters
            </Button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-stone-700 underline decoration-stone-400 underline-offset-2 transition hover:text-stone-900 dark:text-stone-200 dark:hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 shadow-sm dark:border-stone-700/60 dark:bg-stone-900/40">
            <table className="min-w-full divide-y divide-stone-200/70 text-sm dark:divide-stone-800/60">
              <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 dark:bg-stone-900 dark:text-stone-300">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Verses</th>
                  <th className="px-4 py-3">Queued</th>
                  <th className="px-4 py-3">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/60">
                {sortedSongs.map((song) => {
                  const badgeVariant = song.isPublished ? "success" : "warning";

                  return (
                    <tr
                      key={song.id}
                      className="transition hover:bg-stone-50 dark:hover:bg-stone-900/40"
                    >
                      <td className="px-4 py-4 font-medium text-stone-900 dark:text-stone-100">
                        <Link
                          href={
                            song.isPublished
                              ? `/songs/${song.slug}`
                              : `/songs/${song.slug}?preview=true`
                          }
                          className="text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {song.title}
                        </Link>
                        <div className="text-xs text-stone-500 dark:text-stone-400">
                          /{song.slug}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={badgeVariant}
                            className="px-2.5 py-0.5"
                          >
                            {song.isPublished ? "Published" : "Preview"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-stone-600 dark:text-stone-300">
                        {song.verseCount}
                      </td>
                      <td className="px-4 py-4 text-stone-600 dark:text-stone-300">
                        {song.pendingJobs}
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/admin/songs/${song.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-stone-400 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-700 hover:text-white dark:border-stone-500 dark:text-stone-200 dark:hover:bg-stone-200 dark:hover:text-stone-900"
                          >
                            Edit lyrics
                          </Link>
                          <form
                            action={onTogglePublish}
                            className="inline-flex items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="songId"
                              value={song.id}
                            />
                            <input
                              type="hidden"
                              name="slug"
                              value={song.slug}
                            />
                            <input
                              type="hidden"
                              name="publish"
                              value={song.isPublished ? "false" : "true"}
                            />
                            <Button
                              type="submit"
                              variant={song.isPublished ? "danger" : "primary"}
                              size="sm"
                            >
                              {song.isPublished ? "Unpublish" : "Publish"}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedSongs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <Body
                        size="sm"
                        className="text-stone-500 dark:text-stone-400"
                      >
                        {songs.length === 0
                          ? "No songs to display."
                          : "No songs match the current filters."}
                      </Body>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};
