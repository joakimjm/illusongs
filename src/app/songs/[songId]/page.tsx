import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import SongDetail from "@/components/song-detail";
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
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 pb-24 pt-16 md:px-10 lg:pt-24">
      <Link
        href="/"
        className="group inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700"
      >
        <span
          aria-hidden
          className="transition-transform group-hover:-translate-x-1"
        >
          ←
        </span>
        Tilbage til forsiden
      </Link>
      <SongDetail song={song} />
    </main>
  );
};

export default SongPage;
