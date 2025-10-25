"use client";

import { useId, useMemo, useState } from "react";
import type { Song } from "@/data/songs";
import { listTagCategories } from "@/data/tags";

export type SongFiltersValue = {
  readonly text: string;
  readonly tags: ReadonlyArray<string>; // all lower-case
};

export type SongFiltersProps = {
  readonly value: SongFiltersValue;
  readonly onChange: (value: SongFiltersValue) => void;
  readonly songs: ReadonlyArray<Song>;
};

const toNextValue = (
  current: SongFiltersValue,
  partial: Partial<SongFiltersValue>,
): SongFiltersValue => ({
  text: partial.text ?? current.text,
  tags: partial.tags ?? current.tags,
});

const toggleTag = (
  selected: ReadonlyArray<string>,
  tag: string,
): ReadonlyArray<string> => {
  const lower = tag.toLowerCase();
  return selected.includes(lower)
    ? selected.filter((t) => t !== lower)
    : [...selected, lower];
};

type TagCount = {
  readonly tag: string;
  readonly count: number;
};

const computeTagCounts = (
  songs: ReadonlyArray<Song>,
  activeTags: ReadonlyArray<string>,
  text: string,
): Record<string, number> => {
  // We compute counts for selecting an additional tag (prospective AND set).
  const counts: Record<string, number> = {};
  songs.forEach((song) => {
    // Song must already match current text filter.
    const matchesText =
      text.length === 0 ||
      song.title.toLowerCase().includes(text.toLowerCase()) ||
      song.verses.some((v) =>
        v.text.toLowerCase().includes(text.toLowerCase()),
      );
    if (!matchesText) {
      return;
    }
    // For each tag that is not yet selected, see if song would still match when adding it.
    song.tags.forEach((t) => {
      if (activeTags.includes(t)) {
        return; // already required, ignore for prospective addition
      }
      const wouldMatchAll =
        activeTags.every((sel) => song.tags.includes(sel)) &&
        song.tags.includes(t);
      if (wouldMatchAll) {
        counts[t] = (counts[t] ?? 0) + 1;
      }
    });
    // Also count currently active tags for display (so user sees remaining hits for current filter set)
    activeTags.forEach((t) => {
      if (song.tags.includes(t)) {
        counts[t] = (counts[t] ?? 0) + 1;
      }
    });
  });
  return counts;
};

const SongFilters = ({ value, onChange, songs }: SongFiltersProps) => {
  const textId = useId();
  const categories = listTagCategories();
  const [openCategories, setOpenCategories] = useState<ReadonlyArray<string>>(
    [],
  );

  const counts = useMemo(
    () => computeTagCounts(songs, value.tags, value.text),
    [songs, value.tags, value.text],
  );

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  return (
    <form
      className="flex flex-col gap-5 rounded-2xl border border-amber-300/40 bg-white/80 p-4 shadow-sm"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor={textId}
          className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-800"
        >
          Fritekst
        </label>
        <input
          id={textId}
          // Controlled input ensures lowercase matching while preserving original case visually.
          value={value.text}
          onChange={(e) =>
            onChange(toNextValue(value, { text: e.target.value }))
          }
          placeholder="Søg titel eller tekst..."
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
        />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-800">
          Tags
        </legend>
        <div className="flex flex-col divide-y divide-amber-200/60 rounded-lg border border-amber-200/60 bg-amber-50/50">
          {categories.map((category) => {
            const isOpen = openCategories.includes(category.name);
            const categoryTags: TagCount[] = category.tags
              .map((tag) => ({ tag, count: counts[tag] ?? 0 }))
              .filter((t) => t.count > 0 || value.tags.includes(t.tag));
            if (categoryTags.length === 0) {
              return null;
            }
            return (
              <div key={category.name} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  aria-expanded={isOpen}
                >
                  <span>{category.name}</span>
                  <span aria-hidden className="text-amber-700">
                    {isOpen ? "–" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-1 px-3 pb-3 pt-1">
                    {categoryTags.map(({ tag, count }) => {
                      const active = value.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            onChange(
                              toNextValue(value, {
                                tags: toggleTag(value.tags, tag),
                              }),
                            )
                          }
                          className={
                            `group inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500/40 ` +
                            (active
                              ? "border-amber-600 bg-amber-600 text-white hover:bg-amber-500"
                              : "border-amber-300 bg-white text-amber-900 hover:border-amber-500 hover:bg-amber-100")
                          }
                        >
                          <span>{tag}</span>
                          <span
                            className={
                              active
                                ? "text-amber-100"
                                : "text-amber-600 group-hover:text-amber-700"
                            }
                          >
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
      {value.tags.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => onChange({ text: value.text, tags: [] })}
            className="text-[11px] font-medium text-amber-800 underline decoration-dotted underline-offset-2 hover:text-amber-900"
          >
            Nulstil valgte tags
          </button>
        </div>
      )}
    </form>
  );
};

export default SongFilters;
