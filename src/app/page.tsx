import type { Metadata } from "next";
import type { JSX } from "react";
import { Body, HeadingText } from "@/components/typography";
import { APP_NAME } from "@/config/app";
import { HomeScrollBackground } from "@/features/home/components/home-scroll-background";
import { SongbookClient } from "@/features/songs/components/songbook-client";
import {
  fetchPublishedSongs,
  fetchTagMetadata,
} from "@/features/songs/song-queries";
import { groupTagsIntoCategories } from "@/features/songs/song-tag-categories";

type HomePageProps = {
  readonly searchParams?: Record<string, string | string[] | undefined>;
};

export const metadata: Metadata = {
  title: `${APP_NAME} | Illustreret sangbog`,
};

const parseTagsParam = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }

  const rawValue = Array.isArray(value) ? value.join(",") : value;
  return rawValue
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
};

const HomePage = async ({
  searchParams,
}: HomePageProps): Promise<JSX.Element> => {
  const resolvedParams = await Promise.resolve(searchParams ?? {});

  const songs = await fetchPublishedSongs();

  const tagNames = Array.from(
    new Set(songs.flatMap((song) => song.tags.map((tag) => tag))),
  );
  const tagMetadata = await fetchTagMetadata(tagNames);
  const categories = groupTagsIntoCategories(tagMetadata);
  const filterCategories =
    categories.length > 0
      ? categories
      : [
          {
            id: "alle",
            label: "Alle tags",
            tags: tagNames
              .sort((a, b) => a.localeCompare(b, "da"))
              .map((tag) => ({
                id: tag,
                label: tag
                  .split("-")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" "),
              })),
          },
        ];

  const queryParam =
    typeof resolvedParams.q === "string"
      ? decodeURIComponent(resolvedParams.q)
      : "";

  const tagParam = parseTagsParam(resolvedParams.tags);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <HomeScrollBackground />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[720px] flex-col gap-4 px-4 pb-28 pt-16 sm:px-6">
        <header className="rounded-3xl p-4 border border-white/15 backdrop-blur-xl">
          <HeadingText className="text-xs uppercase tracking-[0.45em] text-amber-200 dark:text-amber-200/70">
            {APP_NAME}
          </HeadingText>
          <HeadingText
            as="h1"
            className="text-4xl font-medium text-amber-100/70 mix-blend-multiply dark:text-white sm:text-5xl"
          >
            Saml jer, syng og drøm videre.
          </HeadingText>
          <Body className="text-amber-100">
            Vælg sang efter stemning, figurer eller fritekst – hver side åbner
            en illustreret verden, du kan synge dig ind i med dem, du holder af.
          </Body>
        </header>

        <SongbookClient
          songs={songs}
          categories={filterCategories}
          initialQuery={queryParam}
          initialTags={tagParam}
        />

        <div className="pointer-events-none mx-auto flex flex-col items-center gap-2 text-sm text-[rgba(240,235,230,0.7)]">
          <span className="uppercase tracking-[0.4em]">Scroll</span>
          <span className="inline-block h-7 w-px bg-[rgba(240,235,230,0.4)]" />
        </div>
      </div>
    </main>
  );
};

export default HomePage;
