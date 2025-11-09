import { revalidatePath } from "next/cache";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading } from "@/components/typography";
import { APP_NAME } from "@/config/app";
import { createSongDraft } from "@/features/songs/song-admin-commands";
import { fetchAdminSongSummaries } from "@/features/songs/song-admin-queries";
import { updateSongPublishStatus } from "@/features/songs/song-commands";
import SongDraftForm, { type SongDraftFormState } from "./song-draft-form";
import { SongsTable } from "./songs-table";

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
        <div className="mt-6">
          <SongsTable songs={songs} onTogglePublish={publishToggleAction} />
        </div>
      </Panel>
    </PageShell>
  );
};

export default SongsAdminPage;
