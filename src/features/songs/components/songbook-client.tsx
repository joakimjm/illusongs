"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import type { TagCategoryDto } from "@/features/songs/song-tag-categories";
import type { SongSummaryDto } from "@/features/songs/song-types";
import { useScrollFollow } from "@/utils/use-scroll-follow";

const FILTER_STORAGE_KEY = "songbook:filters";
const SCROLL_STORAGE_KEY = "songbook:scroll-position";

type SongbookClientProps = {
  readonly songs: SongSummaryDto[];
  readonly categories: TagCategoryDto[];
  readonly initialQuery: string;
  readonly initialTags: string[];
};

type StoredFilters = {
  query: string;
  tags: string[];
};

const normalizeTag = (value: string): string => value.trim().toLowerCase();

const parseStoredFilters = (value: string | null): StoredFilters | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredFilters>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((entry): entry is string => typeof entry === "string")
          .map(normalizeTag)
      : [];

    return { query, tags };
  } catch {
    return null;
  }
};

const storeFilters = (filters: StoredFilters) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignorer fejl fra private browsing o.lign.
  }
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

const filterSongs = (
  songs: SongSummaryDto[],
  query: string,
  selectedTags: string[],
): SongSummaryDto[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const hasTags = selectedTags.length > 0;

  if (!hasQuery && !hasTags) {
    return songs;
  }

  return songs.filter((song) => {
    const matchesTags = hasTags
      ? selectedTags.every((tag) => song.tags.includes(tag))
      : true;

    const matchesQuery = hasQuery
      ? song.title.toLowerCase().includes(normalizedQuery) ||
        song.tags.some((tag) => tag.includes(normalizedQuery))
      : true;

    return matchesTags && matchesQuery;
  });
};

const CARD_SCROLL_STRENGTH = 0.05;
const CARD_SCROLL_MAX_OFFSET = 200;

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
        className="group relative block overflow-hidden rounded-[1.75rem] border border-[rgba(195,170,130,0.38)] bg-[rgba(255,248,238,0.85)] shadow-[0_20px_50px_-32px_rgba(110,80,40,0.45)] transition hover:-translate-y-[6px] hover:shadow-[0_28px_60px_-28px_rgba(110,80,40,0.55)] focus:outline-none focus-visible:ring focus-visible:ring-amber-400 dark:border-[color:var(--surface-border)] dark:bg-[color:var(--surface-card)] dark:shadow-[0_18px_44px_-30px_rgba(40,28,14,0.45)] dark:hover:shadow-[0_28px_60px_-28px_rgba(40,28,14,0.55)]"
        aria-label={`${song.title} – åbner sangen`}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-95 transition will-change-transform [transform:scale(1.02)] group-hover:[transform:scale(1.05)]"
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
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(231,201,160,0.6)] via-[rgba(245,224,193,0.8)] to-[rgba(255,243,225,0.85)]" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,18,0.78)] via-[rgba(21,18,24,0.45)] to-[rgba(21,18,28,0.25)]" />
        <div className="relative flex flex-col gap-4 p-6 text-[rgba(255,248,240,0.95)] drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
          <h3 className="font-heading text-2xl font-semibold leading-snug text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            {song.title}
          </h3>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-[rgba(20,18,28,0.6)] px-3 py-1.5 text-sm font-semibold tracking-[0.25em] text-[rgba(255,245,230,0.9)] transition group-hover:bg-[rgba(15,12,20,0.75)]">
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
        ? "border-amber-500 bg-amber-100/90 text-amber-800"
        : "border-[color:var(--surface-border)] bg-[color:var(--surface-card)] text-[color:var(--text-secondary)] hover:border-amber-300 hover:text-amber-700"
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
    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-panel)] px-4 py-2 text-sm text-[color:var(--text-secondary)] shadow-sm transition hover:bg-amber-100/70 hover:text-amber-800"
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
  readonly selectedTags: string[];
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
    <div className="fixed inset-0 z-40 flex flex-col bg-[rgba(22,16,10,0.6)] backdrop-blur-md">
      <div className="mx-auto mt-auto w-full max-w-[720px] rounded-t-[1.75rem] bg-[color:var(--surface-panel)] px-5 pb-8 pt-6 shadow-[0_-28px_60px_-32px_rgba(30,20,10,0.45)]">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-heading text-sm uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
            Søg & filtrér
          </span>
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
                className="rounded-[1.5rem] border border-[color:var(--surface-border)] bg-[color:var(--surface-card)]"
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
                  <span className="font-heading text-lg text-[color:var(--text-primary)]">
                    {category.label}
                  </span>
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
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const previousUrlRef = useRef<string | null>(null);

  const pathname = usePathname();

  const tagLookup = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    categories.forEach((category) => {
      category.tags.forEach((tag) => {
        map.set(tag.id, tag);
      });
    });
    return map;
  }, [categories]);

  useEffect(() => {
    setHasHydrated(true);

    if (initialQuery.length > 0 || initialTags.length > 0) {
      return;
    }

    const restored = parseStoredFilters(
      typeof window === "undefined"
        ? null
        : localStorage.getItem(FILTER_STORAGE_KEY),
    );

    if (restored) {
      setQuery(restored.query);
      setSelectedTags(restored.tags);
    }
  }, [initialQuery, initialTags]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    }

    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","));
    }

    const nextSearch = params.toString();
    const nextUrl =
      nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl =
      typeof window === "undefined"
        ? nextUrl
        : `${window.location.pathname}${window.location.search}`;

    if (
      typeof window !== "undefined" &&
      nextUrl !== currentUrl &&
      nextUrl !== previousUrlRef.current
    ) {
      previousUrlRef.current = nextUrl;
      window.history.replaceState(null, "", nextUrl);
    }

    storeFilters({ query: trimmedQuery, tags: selectedTags });
  }, [hasHydrated, pathname, query, selectedTags]);

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

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((current) => {
      const normalizedTag = normalizeTag(tag);
      const hasTag = current.includes(normalizedTag);
      const next = hasTag
        ? current.filter((entry) => entry !== normalizedTag)
        : [...current, normalizedTag];

      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedTags([]);
  }, []);

  const removeFilter = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    setSelectedTags((current) =>
      current.filter((entry) => entry !== normalized),
    );
  }, []);

  const filteredSongs = useMemo(
    () => filterSongs(songs, query, selectedTags),
    [songs, query, selectedTags],
  );

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
            className="rounded-3xl border border-[rgba(180,150,110,0.25)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-base text-[rgba(50,38,26,0.88)] placeholder:text-[rgba(150,120,90,0.55)] shadow-[inset_0_2px_6px_rgba(210,180,150,0.25)] focus:border-amber-400 focus:outline-none focus-visible:ring focus-visible:ring-amber-300/40 dark:border-transparent dark:bg-[rgba(34,40,55,0.9)] dark:text-white dark:placeholder:text-[rgba(200,205,215,0.6)] dark:shadow-none"
          />
        </label>

        <div className="mt-4 flex items-center gap-6">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(180,120,60,0.25)] bg-[rgba(248,214,164,0.37)] px-4 py-2 text-sm font-semibold text-[rgba(110,60,20,0.9)] transition hover:bg-[rgba(248,214,164,0.5)] dark:border-transparent dark:bg-[rgba(255,205,120,0.18)] dark:text-amber-100 dark:hover:bg-[rgba(255,205,120,0.28)]"
          >
            Søg & filtrér
            {selectedTags.length > 0 ? (
              <span className="flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white dark:bg-amber-600">
                {selectedTags.length}
              </span>
            ) : null}
          </button>
          <p className="flex flex-auto justify-end text-sm text-(--text-muted)">
            {resultsLabel}
          </p>
        </div>

        {selectedTags.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgba(110,80,54,0.65)] dark:text-[rgba(240,235,230,0.7)]">
              Aktive filtre
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tagId) => {
                const tagMeta = tagLookup.get(tagId);
                return tagMeta ? (
                  <ActiveFilterBadge
                    key={tagMeta.id}
                    tag={tagMeta}
                    onRemove={removeFilter}
                  />
                ) : null;
              })}
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-[rgba(120,60,20,0.9)] hover:text-[rgba(90,45,15,1)] dark:text-amber-100 dark:hover:text-white"
              >
                Ryd alle
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {filteredSongs.length === 0 ? (
        <div className="rounded-[2.5rem] border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-card)] p-6 text-center text-[color:var(--text-muted)]">
          Ingen sange passer til filtrene endnu. Vælg en anden stemning eller
          ryd søgningen for at udforske hele sangbogen.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </ul>
      )}

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
