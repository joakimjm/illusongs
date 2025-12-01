"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import { Heading, HeadingText } from "@/components/typography";
import type { TagCategoryDto } from "@/features/songs/song-tag-categories";
import type { SongSummaryDto } from "@/features/songs/song-types";
import { usePagedSongs } from "@/features/songs/use-paged-songs";
import { useTagFilter } from "@/features/songs/use-tag-filter";
import { useScrollFollow } from "@/utils/use-scroll-follow";
import { SongRangePagination } from "./song-range-pagination";

const SCROLL_STORAGE_KEY = "songbook:scroll-position";

type SongbookClientProps = {
  readonly songs: SongSummaryDto[];
  readonly categories: TagCategoryDto[];
  readonly initialQuery: string;
  readonly initialTags: string[];
};

const restoreScrollPosition = () => {
  try {
    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (stored) {
      const position = Number.parseFloat(stored);
      if (!Number.isNaN(position)) {
        window.scrollTo({ top: position, behavior: "auto" });
      }
    }
  } catch {
    // no-op
  }
};

const persistScrollPosition = () => {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, window.scrollY.toString());
  } catch {
    // no-op
  }
};

const CARD_SCROLL_STRENGTH = 0.05;
const CARD_SCROLL_MAX_OFFSET = 200;

const buildTagLookup = (
  categories: TagCategoryDto[],
): Map<string, { id: string; label: string }> => {
  const map = new Map<string, { id: string; label: string }>();
  categories.forEach((category) => {
    category.tags.forEach((tag) => {
      map.set(tag.id, tag);
    });
  });
  return map;
};

const SongCard = ({ song }: { readonly song: SongSummaryDto }) => {
  const cardRef = useScrollFollow<HTMLAnchorElement>({
    strength: CARD_SCROLL_STRENGTH,
    maxOffset: CARD_SCROLL_MAX_OFFSET,
  });

  return (
    <li>
      <Link
        href={`/songs/${song.slug}`}
        ref={cardRef}
        className="group relative block overflow-hidden rounded-[1.75rem] border border-amber-200/50 shadow-[0_20px_50px_-32px_rgba(110,80,40,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(110,80,40,0.55)] focus:outline-none focus-visible:ring focus-visible:ring-amber-400 dark:border-slate-600/50 dark:bg-slate-900/90 dark:shadow-[0_18px_44px_-30px_rgba(40,28,14,0.45)] dark:hover:shadow-[0_28px_60px_-28px_rgba(40,28,14,0.55)]"
        aria-label={`${song.title} – åbner sangen`}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-95 transition will-change-transform transform-[scale(1.02)] group-hover:transform-[scale(1.05)]"
          style={{
            backgroundImage: song.coverImageUrl
              ? `url('${song.coverImageUrl}')`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition:
              "50% calc(50% + var(--scroll-follow-offset, 0px))",
          }}
        >
          {song.coverImageUrl ? null : (
            <div className="absolute inset-0 bg-linear-to-br from-amber-200/60 via-amber-100/80 to-amber-50/90" />
          )}
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-stone-950/80 via-stone-900/45 to-stone-900/25" />
        <div className="relative flex flex-col gap-4 p-6 text-amber-50 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
          <Heading
            level={3}
            className="text-2xl font-semibold leading-snug text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          >
            {song.title}
          </Heading>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-stone-900/70 px-3 py-1.5 text-sm font-semibold tracking-[0.25em] text-amber-100 transition group-hover:bg-stone-900/80">
            Åbn sangen
            <HiChevronRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </li>
  );
};

const TagBadge = ({
  tag,
  active,
  onToggle,
}: {
  readonly tag: { id: string; label: string };
  readonly active: boolean;
  readonly onToggle: (id: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onToggle(tag.id)}
    className={`rounded-full border px-4 py-2 text-sm transition ${
      active
        ? "border-amber-500 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100"
        : "border-amber-200/60 bg-amber-50 text-stone-600 hover:border-amber-300 hover:text-amber-700 dark:border-slate-600/60 dark:bg-slate-900/60 dark:text-stone-300 dark:hover:text-amber-200"
    }`}
    aria-pressed={active}
  >
    {tag.label}
  </button>
);

const ActiveFilterBadge = ({
  tag,
  onRemove,
}: {
  readonly tag: { id: string; label: string };
  readonly onRemove: (id: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onRemove(tag.id)}
    className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-stone-600 shadow-sm transition hover:bg-amber-100 hover:text-amber-800 dark:bg-slate-900/70 dark:text-stone-300 dark:hover:text-amber-100"
  >
    {tag.label}
    <span aria-hidden className="text-base leading-none">
      ×
    </span>
    <span className="sr-only">Fjern filter {tag.label}</span>
  </button>
);

type FilterPanelProps = {
  readonly categories: TagCategoryDto[];
  readonly selectedTags: readonly string[];
  readonly onToggle: (tag: string) => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
};

const FilterPanel = ({
  categories,
  selectedTags,
  onToggle,
  onClear,
  onClose,
}: FilterPanelProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }
    if (
      expandedCategory === null ||
      !categories.some((category) => category.id === expandedCategory)
    ) {
      setExpandedCategory(categories[0]?.id ?? null);
    }
  }, [categories, expandedCategory]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-stone-950/60 backdrop-blur-md">
      <div className="mx-auto mt-auto w-full max-w-[720px] rounded-t-[1.75rem] bg-amber-50 px-5 pb-8 pt-6 shadow-[0_-28px_60px_-32px_rgba(30,20,10,0.45)] dark:bg-slate-900/80">
        <div className="mb-4 flex items-center justify-between">
          <HeadingText className="text-sm uppercase tracking-[0.35em] text-stone-500 dark:text-stone-300">
            Søg & filtrér
          </HeadingText>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Luk
          </button>
        </div>

        <div className="space-y-3">
          {categories.map((category) => {
            const isExpanded = expandedCategory === category.id;
            return (
              <div
                key={category.id}
                className="rounded-3xl border border-amber-200/60 bg-amber-50 dark:border-slate-600/60 dark:bg-slate-900/80"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCategory((current) =>
                      current === category.id ? null : category.id,
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <HeadingText
                    as="span"
                    className="text-lg text-stone-700 dark:text-stone-100"
                  >
                    {category.label}
                  </HeadingText>
                  <span className="text-amber-700">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>
                {isExpanded ? (
                  <div className="flex flex-wrap gap-2 px-5 pb-5">
                    {category.tags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        tag={tag}
                        active={selectedTags.includes(tag.id)}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {selectedTags.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-5 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Ryd valg
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const SongbookClient = ({
  songs,
  categories,
  initialQuery,
  initialTags,
}: SongbookClientProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const tagLookup = buildTagLookup(categories);
  const {
    query,
    setQuery,
    selectedTags,
    toggleTag,
    removeTag,
    clearFilters,
    filteredSongs,
  } = useTagFilter({
    songs,
    initialQuery,
    initialTags,
  });
  const { currentPage, pages, setPageIndex } = usePagedSongs(filteredSongs);
  const visibleSongs =
    pages.length > 1 && currentPage ? currentPage.items : filteredSongs;
  const activeRangeIndex = useMemo(() => {
    if (!currentPage) {
      return 0;
    }
    const index = pages.indexOf(currentPage);
    return index >= 0 ? index : 0;
  }, [currentPage, pages]);

  useEffect(() => {
    restoreScrollPosition();

    const handlePersist = () => {
      persistScrollPosition();
    };

    window.addEventListener("pagehide", handlePersist);
    window.addEventListener("beforeunload", handlePersist);

    return () => {
      handlePersist();
      window.removeEventListener("pagehide", handlePersist);
      window.removeEventListener("beforeunload", handlePersist);
    };
  }, []);

  const resultsLabel =
    filteredSongs.length === 1
      ? "Viser 1 illustreret sang"
      : `Viser ${filteredSongs.length} illustrerede sange`;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <section className="rounded-3xl p-4 border border-white/15 backdrop-blur-xl">
        <label className="flex flex-col gap-2" htmlFor="songbook-search">
          <span className="text-xs uppercase tracking-[0.4em] text-amber-200 dark:text-amber-200/70">
            Søg i sangbogen
          </span>
          <input
            id="songbook-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søg efter titel, stemning eller figur"
            className="rounded-3xl border border-amber-200/50 bg-white/5 px-4 py-3 text-base text-stone-100 placeholder:text-amber-300 focus:border-amber-400 focus:outline-none focus-visible:ring focus-visible:ring-amber-300/40 dark:border-slate-700/40 dark:bg-slate-900/80 dark:text-stone-100 dark:placeholder:text-slate-400"
          />
        </label>

        <div className="mt-4 flex items-center gap-6">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-stone-800/30 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-100/60 dark:border-amber-200/30 dark:bg-amber-200/10 dark:text-amber-100 dark:hover:bg-amber-200/20"
          >
            Søg & filtrér
            {selectedTags.length > 0 ? (
              <span className="flex h-5 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white dark:bg-amber-600">
                {selectedTags.length}
              </span>
            ) : null}
          </button>
          <p className="flex flex-auto justify-end text-sm text-stone-100 dark:text-stone-300">
            {resultsLabel}
          </p>
        </div>

        {selectedTags.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500 dark:text-stone-300">
              Aktive filtre
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tagId) => {
                const tagMeta = tagLookup.get(tagId);
                return tagMeta ? (
                  <ActiveFilterBadge
                    key={tagMeta.id}
                    tag={tagMeta}
                    onRemove={removeTag}
                  />
                ) : null;
              })}
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-100 dark:hover:text-white"
              >
                Ryd alle
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {filteredSongs.length === 0 ? (
        <div className="rounded-[2.5rem] border border-dashed border-amber-200/60 bg-amber-50 p-6 text-center text-stone-500 dark:border-slate-600/60 dark:bg-slate-900/80 dark:text-stone-300">
          Ingen sange passer til filtrene endnu. Vælg en anden stemning eller
          ryd søgningen for at udforske hele sangbogen.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {visibleSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </ul>
      )}

      <SongRangePagination
        pages={pages}
        activeIndex={activeRangeIndex}
        onSelect={setPageIndex}
      />

      {isFilterOpen ? (
        <FilterPanel
          categories={categories}
          selectedTags={selectedTags}
          onToggle={toggleTag}
          onClear={clearFilters}
          onClose={() => setIsFilterOpen(false)}
        />
      ) : null}
    </div>
  );
};
