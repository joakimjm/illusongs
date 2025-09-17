import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import SongImmersiveViewer from "@/components/song-immersive-viewer";
import { getSongById, listSongs } from "@/data/songs";

type SongPageParams = {
  readonly songId: string;
};

type SongPageProps = {
  readonly params: Promise<SongPageParams>;
};

export const generateStaticParams = async (): Promise<SongPageParams[]> =>
  Array.from(listSongs(), (song) => ({ songId: song.id }));

export const generateMetadata = async ({
  params,
}: SongPageProps): Promise<Metadata> => {
  const { songId } = await params;
  const song = getSongById(songId);

  if (song === undefined) {
    return {
      title: "Sang ikke fundet",
    } satisfies Metadata;
  }

  return {
    title: song.title,
    description: `Læs teksten og se illustrationerne til "${song.title}"`,
  } satisfies Metadata;
};

const SongPage = async ({ params }: SongPageProps) => {
  const { songId } = await params;
  const song = getSongById(songId);

  if (song === undefined) {
    notFound();
  }

  return (
    <main className="relative flex min-h-screen flex-col text-white">
      <div className="fixed z-10 top-4 flex w-full max-w-6xl items-center justify-between px-4 sm:px-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-full border border-white/25 bg-yellow-900/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200 transition hover:bg-white/20 backdrop-blur-sm"
        >
          <span
            aria-hidden
            className="text-base transition-transform group-hover:-translate-x-1"
          >
            ←
          </span>
          Tilbage
        </Link>
        <p className="hidden text-sm font-semibold uppercase tracking-[0.28em] text-amber-100 md:block">
          {song.title}
        </p>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 px-0 sm:px-10">
        <SongImmersiveViewer song={song} />
      </div>
    </main>
  );
};

export default SongPage;
