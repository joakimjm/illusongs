import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading } from "@/components/typography";
import { APP_NAME } from "@/config/app";
import {
  InvalidSongVerseUpdateError,
  reconcileSongVerses,
} from "@/features/songs/song-admin-commands";
import { findAdminSongById } from "@/features/songs/song-admin-queries";
import { isValidUuid } from "@/utils";
import SongLyricsForm, { type SongLyricsFormState } from "../song-lyrics-form";

const ADMIN_SONGS_PATH = "/admin/songs";
const PUBLIC_SONGS_PATH = "/songs";

class InvalidLyricsFormError extends Error {}

type SongLyricsEditorPageParams = {
  songId: string;
};

type SongLyricsEditorPageProps = {
  params: SongLyricsEditorPageParams | Promise<SongLyricsEditorPageParams>;
};

const parseVersesTextFromFormData = (formData: FormData): string => {
  const verses = formData.get("verses");
  if (typeof verses !== "string") {
    throw new InvalidLyricsFormError("Song verses text is required.");
  }
  return verses;
};

const SongLyricsEditorPage = async ({
  params,
}: SongLyricsEditorPageProps) => {
  const resolvedParams = await Promise.resolve(params);
  const songId = resolvedParams.songId.trim().toLowerCase();

  if (!isValidUuid(songId)) {
    notFound();
  }

  const song = await findAdminSongById(songId);
  if (!song) {
    notFound();
  }

  const updateLyricsAction = async (
    _prevState: SongLyricsFormState,
    formData: FormData,
  ): Promise<SongLyricsFormState> => {
    "use server";

    try {
      const versesText = parseVersesTextFromFormData(formData);

      const result = await reconcileSongVerses({
        songId: song.id,
        versesText,
      });

      revalidatePath(ADMIN_SONGS_PATH);
      revalidatePath(`/admin/songs/${song.id}`);
      revalidatePath(`${PUBLIC_SONGS_PATH}/${song.slug}`);

      return {
        status: "success",
        message: `Lyrics updated. ${result.matchedVerseCount} matched, ${result.insertedVerseCount} added, ${result.removedVerseCount} removed.${result.wasUnpublished ? " Song was automatically unpublished for review." : ""}`,
      };
    } catch (error) {
      if (
        error instanceof InvalidLyricsFormError ||
        error instanceof InvalidSongVerseUpdateError
      ) {
        return {
          status: "error",
          message: error.message,
        };
      }

      return {
        status: "error",
        message: "Unable to save lyrics.",
      };
    }
  };

  return (
    <PageShell>
      <HeroHeader
        eyebrow={APP_NAME}
        title={`Edit lyrics: ${song.title}`}
        description="Correct whitespace and lyric mistakes verse by verse."
      />

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Heading level={2} className="text-base">
              Song text
            </Heading>
            <Body size="sm" className="text-slate-600 dark:text-slate-300">
              Edit all verses in one field. Separate verses with a blank line.
              Reconciled verses keep their existing images. New verses queue new
              illustration jobs.
            </Body>
          </div>
          <Link
            href={ADMIN_SONGS_PATH}
            className="text-sm font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Back to songs
          </Link>
        </div>

        <div className="mt-6">
          <SongLyricsForm
            initialVersesText={song.verses.map((verse) => verse.lyricText).join("\n\n")}
            action={updateLyricsAction}
          />
        </div>
      </Panel>
    </PageShell>
  );
};

export default SongLyricsEditorPage;
