import { expect, test } from "vitest";
import { buildVerseIllustrationObjectPath } from "./verse-illustration-storage";

test("buildVerseIllustrationObjectPath normalizes path segments", () => {
  const path = buildVerseIllustrationObjectPath(
    "Song ID 123",
    "Verse/ID*Segment",
  );

  const segments = path.split("/");
  expect(segments).toHaveLength(3);
  expect(segments[0]).toBe("song-id-123");
  expect(segments[1]).toBe("verse-id-segment");
  expect(segments[2]).toMatch(/^main-[0-9]{4}-.*\.webp$/);
});

test("buildVerseIllustrationObjectPath generates unique object names", () => {
  const firstPath = buildVerseIllustrationObjectPath("song-id", "verse-id");
  const secondPath = buildVerseIllustrationObjectPath("song-id", "verse-id");

  expect(firstPath).not.toBe(secondPath);
});
