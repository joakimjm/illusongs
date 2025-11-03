import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { cache } from "react";
import { APP_NAME } from "@/config/app";
import { SongVerseCarousel } from "@/features/songs/components/song-verse-carousel";
import { findSongBySlug } from "@/features/songs/song-queries";
import type { SongDetailDto } from "@/features/songs/song-types";

type SongPageParams = {
  slug: string;
};

type SongPageParamsInput = {
  params: SongPageParams | Promise<SongPageParams>;
};

const loadSong = cache(async (slug: string): Promise<SongDetailDto | null> => {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  const song = await findSongBySlug(normalized);
  if (!song || !song.isPublished) {
    return null;
  }

  return song;
});

export const generateMetadata = async ({
  params,
}: SongPageParamsInput): Promise<Metadata> => {
  const resolvedParams = await Promise.resolve(params);
  const song = await loadSong(resolvedParams.slug);

  if (!song) {
    return {
      title: `Sang ikke fundet | ${APP_NAME}`,
    };
  }

  return {
    title: `${song.title} | ${APP_NAME}`,
    description: `Syng med på "${song.title}" og oplev illustrationerne vers for vers.`,
  };
};

const SongPage = async ({
  params,
}: SongPageParamsInput): Promise<JSX.Element> => {
  const resolvedParams = await Promise.resolve(params);
  const song = await loadSong(resolvedParams.slug);
  if (!song) {
    notFound();
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <SongVerseCarousel songTitle={song.title} verses={song.verses} />
    </main>
  );
};

export default SongPage;
