import { expect, test } from "vitest";
import { InvalidSongSlugError, normalizeSongSlugParam } from "./route";

test("normalizeSongSlugParam lowercases and trims slug", () => {
  const slug = normalizeSongSlugParam("  Jeg-Har-Fanget  ");
  expect(slug).toBe("jeg-har-fanget");
});

test("normalizeSongSlugParam throws when slug is missing", () => {
  const act = () => normalizeSongSlugParam(" ");
  expect(act).toThrowError(InvalidSongSlugError);
});
