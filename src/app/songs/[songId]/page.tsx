import type { Metadata } from "next";
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
    <main className="relative flex min-h-[100dvh] flex-col bg-black text-white">
      <SongImmersiveViewer song={song} />
    </main>
  );
};

export default SongPage;
