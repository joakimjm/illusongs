import Link from "next/link";
import type { JSX } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Body } from "@/components/typography";
import type { AdminSongSummary } from "@/features/songs/song-admin-queries";

type SongsTableProps = {
  readonly songs: readonly AdminSongSummary[];
  readonly onTogglePublish: (formData: FormData) => Promise<void>;
};

export const SongsTable = ({
  songs,
  onTogglePublish,
}: SongsTableProps): JSX.Element => (
  <div className="-mx-4 overflow-x-auto sm:mx-0">
    <div className="inline-block min-w-full align-middle">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800/60">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verses</th>
              <th className="px-4 py-3">Queued</th>
              <th className="px-4 py-3">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
            {songs.map((song) => {
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
