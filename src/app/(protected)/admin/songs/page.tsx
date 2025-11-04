import { revalidatePath } from "next/cache";
import { Badge } from "@/components/badge";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading } from "@/components/typography";
import { APP_NAME } from "@/config/app";
import { createSongDraft } from "@/features/songs/song-admin-commands";
import { fetchAdminSongSummaries } from "@/features/songs/song-admin-queries";
import { updateSongPublishStatus } from "@/features/songs/song-commands";
import SongDraftForm, { type SongDraftFormState } from "./song-draft-form";

const SONGS_PATH = "/admin/songs";

const createSongDraftAction = async (
  _prev: SongDraftFormState,
  formData: FormData,
): Promise<SongDraftFormState> => {
  "use server";

  const title = formData.get("title");
  const verses = formData.get("verses");
  const tagsRaw = formData.get("tags");

  if (typeof title !== "string" || typeof verses !== "string") {
    return {
      status: "error",
      message: "Title and verses are required.",
    };
  }

  const tags =
    typeof tagsRaw === "string" && tagsRaw.trim().length > 0
      ? tagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

  try {
    await createSongDraft({
      title,
      versesText: verses,
      tags,
    });
    revalidatePath(SONGS_PATH);
    return {
      status: "success",
      message: "Song draft created. Illustration jobs enqueued per verse.",
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unable to create song.";
    return {
      status: "error",
      message: detail,
    };
  }
};

const publishToggleAction = async (formData: FormData): Promise<void> => {
  "use server";

  const songId = formData.get("songId");
  const publish = formData.get("publish");

  if (typeof songId !== "string" || typeof publish !== "string") {
    return;
  }

  await updateSongPublishStatus(songId, publish === "true");
  revalidatePath(SONGS_PATH);
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const SongsAdminPage = async () => {
  const songs = await fetchAdminSongSummaries();

  return (
    <PageShell>
      <HeroHeader
        eyebrow={APP_NAME}
        title="Songs"
        description="Create song drafts, track illustration progress, and publish finished pieces."
      />

      <Panel>
        <Heading level={2} className="text-base">
          Create song draft
        </Heading>
        <Body size="sm" className="text-slate-600 dark:text-slate-300">
          Paste all verses at once. We split them, queue illustration jobs, and
          leave the song unpublished until you decide otherwise.
        </Body>
        <div className="mt-4">
          <SongDraftForm action={createSongDraftAction} />
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Heading level={2} className="text-base">
              Existing songs
            </Heading>
          </div>
          <Body size="sm" className="text-slate-600 dark:text-slate-300">
            {songs.length === 0
              ? "No songs yet. Draft a song above to get started."
              : "Use the controls on the right to publish or unpublish."}
          </Body>
        </div>

        <div className="mt-6 -mx-4 overflow-x-auto sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
              <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800/60">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Verses</th>
                    <th className="px-4 py-3">Queued</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
                  {songs.map((song) => {
                    const badgeVariant = song.isPublished
                      ? "success"
                      : "neutral";

                    return (
                      <tr
                        key={song.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {song.title}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {song.slug}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {song.verseCount}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {song.pendingJobs}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={badgeVariant}
                            className="px-2.5 py-0.5"
                          >
                            {song.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {formatDate(song.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {formatDate(song.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form
                            action={publishToggleAction}
                            className="inline-flex items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="songId"
                              value={song.id}
                            />
                            <input
                              type="hidden"
                              name="publish"
                              value={song.isPublished ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
                            >
                              {song.isPublished ? "Unpublish" : "Publish"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                  {songs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center">
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
      </Panel>
    </PageShell>
  );
};

export default SongsAdminPage;
