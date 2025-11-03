export type TagOption = {
  id: string;
  label: string;
};

export type TagCategoryDto = {
  id: string;
  label: string;
  tags: TagOption[];
};

export type TagMetadata = {
  name: string;
  displayName: string | null;
  categorySlug: string | null;
  categoryLabel: string | null;
};

const fallbackCategorySlug = "andre";
const fallbackCategoryLabel = "Andre";

const formatDisplayLabel = (
  tag: Pick<TagMetadata, "name" | "displayName">,
): string => {
  if (tag.displayName && tag.displayName.trim().length > 0) {
    return tag.displayName.trim();
  }

  return tag.name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const groupTagsIntoCategories = (
  metadata: readonly TagMetadata[],
): TagCategoryDto[] => {
  const categories = new Map<string, TagCategoryDto>();

  metadata.forEach((tag) => {
    const categorySlug = tag.categorySlug ?? fallbackCategorySlug;
    const categoryLabel = tag.categoryLabel ?? fallbackCategoryLabel;

    if (!categories.has(categorySlug)) {
      categories.set(categorySlug, {
        id: categorySlug,
        label: categoryLabel,
        tags: [],
      });
    }

    const category = categories.get(categorySlug);
    if (!category) {
      return;
    }

    category.tags.push({
      id: tag.name,
      label: formatDisplayLabel(tag),
    });
  });

  const sortedCategories = [...categories.values()].map((category) => ({
    ...category,
    tags: category.tags.sort((a, b) => a.label.localeCompare(b.label, "da")),
  }));

  return sortedCategories.sort((a, b) => a.label.localeCompare(b.label, "da"));
};
