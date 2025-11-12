type TitleCarrier = {
  readonly title: string;
};

export type SongTitleRangeGroup<T extends TitleCarrier> = {
  readonly label: string;
  readonly startTitle: string;
  readonly endTitle: string;
  readonly items: readonly T[];
};

const DEFAULT_LOCALE = "da";
const DEFAULT_TARGET_GROUP_SIZE = 10;

const collatorCache = new Map<string, Intl.Collator>();

const getCollator = (locale: string): Intl.Collator => {
  const cached = collatorCache.get(locale);
  if (cached) {
    return cached;
  }
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  collatorCache.set(locale, collator);
  return collator;
};

const findInitial = (title: string, locale: string): string => {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return "#";
  }

  for (const char of trimmed) {
    if (/\p{L}|\p{N}/u.test(char)) {
      return char.toLocaleUpperCase(locale);
    }
  }

  const [firstChar] = trimmed;
  return firstChar ? firstChar.toLocaleUpperCase(locale) : "#";
};

const buildLabel = (
  startTitle: string,
  endTitle: string,
  locale: string,
): string => {
  const startInitial = findInitial(startTitle, locale);
  const endInitial = findInitial(endTitle, locale);

  if (startInitial === endInitial) {
    return startInitial;
  }

  return `${startInitial} - ${endInitial}`;
};

export const computeGroupSize = (
  totalItems: number,
  targetGroupSize: number,
): number => {
  const normalizedTarget = Math.max(1, targetGroupSize);
  if (totalItems <= normalizedTarget) {
    return totalItems || 1;
  }

  const estimatedGroupCount = Math.max(
    1,
    Math.round(totalItems / normalizedTarget),
  );

  return Math.max(1, Math.ceil(totalItems / estimatedGroupCount));
};

export const groupSongsByTitleRange = <T extends TitleCarrier>({
  songs,
  targetGroupSize = DEFAULT_TARGET_GROUP_SIZE,
  locale = DEFAULT_LOCALE,
}: {
  readonly songs: readonly T[];
  readonly targetGroupSize?: number;
  readonly locale?: string;
}): SongTitleRangeGroup<T>[] => {
  if (songs.length === 0) {
    return [];
  }

  const collator = getCollator(locale);
  const sortedSongs = [...songs].sort((a, b) =>
    collator.compare(a.title.trim(), b.title.trim()),
  );

  const groupSize = computeGroupSize(sortedSongs.length, targetGroupSize);
  const groups: SongTitleRangeGroup<T>[] = [];

  for (let index = 0; index < sortedSongs.length; index += groupSize) {
    const slice = sortedSongs.slice(index, index + groupSize);
    const first = slice[0];
    const last = slice[slice.length - 1];

    if (!first || !last) {
      continue;
    }

    groups.push({
      label: buildLabel(first.title, last.title, locale),
      startTitle: first.title,
      endTitle: last.title,
      items: slice,
    });
  }

  return groups;
};
