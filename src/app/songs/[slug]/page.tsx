import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { cache } from "react";
import { APP_NAME } from "@/config/app";
import { isAdminUser } from "@/features/auth/policies";
import { SongVerseCarousel } from "@/features/songs/components/song-verse-carousel";
import {
  fetchPublishedSongSlugs,
  findSongBySlug,
} from "@/features/songs/song-queries";
import type { SongDetailDto } from "@/features/songs/song-types";
import { getUser } from "@/features/supabase/server";

type SongPageParams = {
  slug: string;
};

type SongPageParamsInput = {
  params: SongPageParams | Promise<SongPageParams>;
};

type SongPageSearchParams = {
  preview?: string | string[];
};

type SongPageSearchParamsInput = {
  searchParams?: SongPageSearchParams | Promise<SongPageSearchParams>;
};

const PREVIEW_QUERY_VALUE = "true";

export const generateStaticParams = async (): Promise<SongPageParams[]> => {
  const slugs = await fetchPublishedSongSlugs();
  return slugs.map((slug) => ({ slug }));
};

const loadSong = cache(
  async (
    slug: string,
    includeUnpublished: boolean,
  ): Promise<SongDetailDto | null> => {
    const normalized = slug.trim().toLowerCase();
    if (normalized.length === 0) {
      return null;
    }

    const song = await findSongBySlug(normalized);
    if (!song) {
      return null;
    }

    if (!includeUnpublished && !song.isPublished) {
      return null;
    }

    return song;
  },
);

const shouldEnablePreview = async (
  searchParams?: SongPageSearchParams | Promise<SongPageSearchParams>,
): Promise<boolean> => {
  const resolved = await Promise.resolve(searchParams ?? {});
  const rawPreview = resolved.preview;
  const previewValue = Array.isArray(rawPreview) ? rawPreview[0] : rawPreview;

  if (!previewValue || previewValue.toLowerCase() !== PREVIEW_QUERY_VALUE) {
    return false;
  }

  const user = await getUser();
  if (!user) {
    return false;
  }

  return isAdminUser(user);
};

export const generateMetadata = async ({
  params,
  searchParams,
}: SongPageParamsInput & SongPageSearchParamsInput): Promise<Metadata> => {
  const [resolvedParams, previewEnabled] = await Promise.all([
    Promise.resolve(params),
    shouldEnablePreview(searchParams),
  ]);

  const song = await loadSong(resolvedParams.slug, previewEnabled);

  if (!song) {
    return {
      title: `Sang ikke fundet | ${APP_NAME}`,
    };
  }

  return {
    title: `${song.title}${previewEnabled && !song.isPublished ? " (preview)" : ""} | ${APP_NAME}`,
    description: `Syng med på "${song.title}" og oplev illustrationerne vers for vers.`,
  };
};

const SongPage = async ({
  params,
  searchParams,
}: SongPageParamsInput & SongPageSearchParamsInput): Promise<JSX.Element> => {
  const [resolvedParams, previewEnabled] = await Promise.all([
    Promise.resolve(params),
    shouldEnablePreview(searchParams),
  ]);

  const song = await loadSong(resolvedParams.slug, previewEnabled);
  if (!song) {
    notFound();
  }

  const isPreview = previewEnabled && !song.isPublished;

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
      />
    </main>
  );
};

export default SongPage;
