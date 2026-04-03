export type JobSort =
  | "queue"
  | "updated_desc"
  | "updated_asc"
  | "song_title_asc"
  | "song_title_desc"
  | "status";

export const parseBooleanParam = (
  value: string | string[] | undefined,
  defaultValue: boolean = false,
): boolean => {
  if (Array.isArray(value)) {
    const normalizedValues = value.map((entry) => entry.trim().toLowerCase());
    if (
      normalizedValues.some(
        (entry) => entry === "1" || entry === "true" || entry === "yes",
      )
    ) {
      return true;
    }
    if (
      normalizedValues.some(
        (entry) => entry === "0" || entry === "false" || entry === "no",
      )
    ) {
      return false;
    }
    return defaultValue;
  }

  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

export const parseSearchParam = (
  value: string | string[] | undefined,
): string => {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved?.trim() ?? "";
};

const isJobSort = (value: string): value is JobSort => {
  switch (value) {
    case "queue":
    case "updated_desc":
    case "updated_asc":
    case "song_title_asc":
    case "song_title_desc":
    case "status":
      return true;
    default:
      return false;
  }
};

export const parseSortParam = (
  value: string | string[] | undefined,
): JobSort => {
  const resolved = Array.isArray(value) ? value[0] : value;
  const normalized = resolved?.trim().toLowerCase();

  if (normalized && isJobSort(normalized)) {
    return normalized;
  }

  return "queue";
};
