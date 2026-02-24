import { revalidatePath } from "next/cache";
import { Button } from "@/components/button";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading } from "@/components/typography";
import { createSongDraft } from "@/features/songs/song-admin-commands";
import { fetchAdminSongSummaries } from "@/features/songs/song-admin-queries";
import { updateSongPublishStatus } from "@/features/songs/song-commands";
import SongDraftForm, { type SongDraftFormState } from "./song-draft-form";
import { SongsTable } from "./songs-table";

const SONGS_PATH = "/admin/songs";
const PUBLIC_SONGS_PATH = "/songs";
const HOME_PATH = "/";

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
  const slug = formData.get("slug");

  if (
    typeof songId !== "string" ||
    typeof publish !== "string" ||
    typeof slug !== "string"
  ) {
    return;
  }

  await updateSongPublishStatus(songId, publish === "true");
  revalidatePath(SONGS_PATH);
  revalidatePath(`${PUBLIC_SONGS_PATH}/${slug}`);
  revalidatePath(HOME_PATH);
};

const SongsAdminPage = async () => {
  const songs = await fetchAdminSongSummaries();

  return (
    <PageShell variant="embedded">
      <HeroHeader
        title="Songs"
        description="Review illustration progress, publish completed songs, and draft new songs when needed."
      />

      <Panel as="details">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col gap-1">
            <Heading level={2} className="text-base">
              Create song draft
            </Heading>
            <Body size="sm" className="text-stone-600 dark:text-stone-300">
              Start a new draft without leaving this workflow.
            </Body>
          </div>
          <Button as="span" variant="secondary" size="sm">
            Open editor
          </Button>
        </summary>
        <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
          <Body size="sm" className="text-stone-600 dark:text-stone-300">
            Paste all verses at once. We split them, queue illustration jobs,
            and leave the song unpublished until you decide otherwise.
          </Body>
          <div className="mt-4">
            <SongDraftForm action={createSongDraftAction} />
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Heading level={2} className="text-base">
              Existing songs
            </Heading>
          </div>
          <Body size="sm" className="text-stone-600 dark:text-stone-300">
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
