"use client";

import Link from "next/link";
import { type JSX, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Body } from "@/components/typography";
import type { AdminSongSummary } from "@/features/songs/song-admin-queries";

type SortKey = "title" | "status" | "verses" | "queued";
type SortDir = "asc" | "desc";

type SortState = {
  key: SortKey;
  dir: SortDir;
};

const SORT_LABELS: Record<SortKey, string> = {
  title: "Title",
  status: "Status",
  verses: "Verses",
  queued: "Queued",
};

const sortSongs = (
  songs: readonly AdminSongSummary[],
  sort: SortState,
): AdminSongSummary[] => {
  const multiplier = sort.dir === "asc" ? 1 : -1;
  return [...songs].sort((a, b) => {
    switch (sort.key) {
      case "title":
        return (
          multiplier *
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
      case "status":
        if (a.isPublished === b.isPublished) return 0;
        return a.isPublished ? -1 * multiplier : 1 * multiplier;
      case "verses":
        return multiplier * (a.verseCount - b.verseCount);
      case "queued":
        return multiplier * (a.pendingJobs - b.pendingJobs);
      default:
        return 0;
    }
  });
};

const SortButton = ({
  column,
  sort,
  onChange,
}: {
  column: SortKey;
  sort: SortState;
  onChange: (key: SortKey) => void;
}) => {
  const isActive = sort.key === column;
  const label = SORT_LABELS[column];
  const icon = isActive ? (sort.dir === "asc" ? "↑" : "↓") : "⇅";

  return (
    <button
      type="button"
      onClick={() => onChange(column)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition ${
        isActive
          ? "text-slate-900 dark:text-slate-100"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      <span>{label}</span>
      <span aria-hidden>{icon}</span>
      <span className="sr-only">
        {isActive ? `sorted ${sort.dir}` : "activate sort"}
      </span>
    </button>
  );
};

type SongsTableProps = {
  readonly songs: readonly AdminSongSummary[];
  readonly onTogglePublish: (formData: FormData) => Promise<void>;
};

export const SongsTable = ({
  songs,
  onTogglePublish,
}: SongsTableProps): JSX.Element => {
  const [sort, setSort] = useState<SortState>({ key: "title", dir: "asc" });

  const sortedSongs = useMemo(() => sortSongs(songs, sort), [songs, sort]);

  const handleSortChange = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800/60">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">
                  <SortButton
                    column="title"
                    sort={sort}
                    onChange={handleSortChange}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    column="status"
                    sort={sort}
                    onChange={handleSortChange}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    column="verses"
                    sort={sort}
                    onChange={handleSortChange}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    column="queued"
                    sort={sort}
                    onChange={handleSortChange}
                  />
                </th>
                <th className="px-4 py-3">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
              {sortedSongs.map((song) => {
                const badgeVariant = song.isPublished ? "success" : "warning";

                return (
                  <tr
                    key={song.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <Link
                        href={
                          song.isPublished
                            ? `/songs/${song.slug}`
                            : `/songs/${song.slug}?preview=true`
                        }
                        className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {song.title}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        /{song.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={badgeVariant} className="px-2.5 py-0.5">
                          {song.isPublished ? "Published" : "Preview"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {song.verseCount}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {song.pendingJobs}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/songs/${song.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-blue-500 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-400 dark:hover:text-slate-950"
                        >
                          Edit lyrics
                        </Link>
                        <form
                          action={onTogglePublish}
                          className="inline-flex items-center gap-2"
                        >
                          <input type="hidden" name="songId" value={song.id} />
                          <input type="hidden" name="slug" value={song.slug} />
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
              {songs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <Body
                      size="sm"
                      className="text-slate-500 dark:text-slate-400"
                    >
                      No songs to display.
                    </Body>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
