import rawTags from "@/../public/tags.json";

// A category has a name (key) and array of tag strings.
export type TagCategory = {
  readonly name: string;
  readonly tags: ReadonlyArray<string>;
};

export type TagCategoryMap = ReadonlyArray<TagCategory>;

// Runtime validation (lightweight) while keeping full type safety.
const parseTagCategories = (value: unknown): TagCategoryMap => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Tags document must be an object map");
  }

  const entries: TagCategoryMap = Object.entries(value).map(([key, maybe]) => {
    if (!Array.isArray(maybe)) {
      throw new Error(`Tag category '${key}' must be an array`);
    }

    const tags = maybe.map((t, index) => {
      if (typeof t !== "string") {
        throw new Error(
          `Tag at index ${index} in category '${key}' must be a string`,
        );
      }
      return t.toLowerCase();
    });

    return { name: key, tags };
  });

  return entries;
};

const tagCategories: TagCategoryMap = parseTagCategories(rawTags);

export const listTagCategories = (): TagCategoryMap => tagCategories;

export const listAllTags = (): ReadonlyArray<string> =>
  tagCategories.flatMap((c) => c.tags);
