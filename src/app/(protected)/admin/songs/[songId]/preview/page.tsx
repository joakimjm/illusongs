import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { SongVerseCarousel } from "@/features/songs/components/song-verse-carousel";
import { findAdminSongById } from "@/features/songs/song-admin-queries";
import { updateSongPublishStatus } from "@/features/songs/song-commands";
import { findSongBySlug } from "@/features/songs/song-queries";
import { isValidUuid } from "@/utils";

const SONGS_ADMIN_PATH = "/admin/songs";
const HOME_PATH = "/";

type SongPreviewPageParams = {
  songId: string;
};

type SongPreviewPageProps = {
  params: SongPreviewPageParams | Promise<SongPreviewPageParams>;
};

const SongPreviewPage = async ({
  params,
}: SongPreviewPageProps): Promise<JSX.Element> => {
  const resolvedParams = await Promise.resolve(params);
  const songId = resolvedParams.songId.trim().toLowerCase();

  if (!isValidUuid(songId)) {
    notFound();
  }

  const adminSong = await findAdminSongById(songId);
  if (!adminSong) {
    notFound();
  }

  const song = await findSongBySlug(adminSong.slug);
  if (!song) {
    notFound();
  }

  const isPreview = !song.isPublished;
  const publishSongAction = async (): Promise<void> => {
    "use server";

    await updateSongPublishStatus(song.id, true);
    revalidatePath(SONGS_ADMIN_PATH);
    revalidatePath(`/admin/songs/${song.id}/preview`);
    revalidatePath(`/songs/${song.slug}`);
    revalidatePath(HOME_PATH);
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      {isPreview ? (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex justify-center">
          <span className="pointer-events-auto mt-6 rounded-full border border-amber-400/70 bg-amber-100/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-900 shadow-lg dark:border-amber-300/70 dark:bg-amber-300/80 dark:text-amber-950">
            Previewing unpublished song
          </span>
        </div>
      ) : null}
      <SongVerseCarousel
        songTitle={song.title}
        verses={song.verses}
        enableRequeue={isPreview}
        songId={song.id}
        songSlug={song.slug}
        onPublish={isPreview ? publishSongAction : undefined}
      />
    </main>
  );
};

export default SongPreviewPage;
