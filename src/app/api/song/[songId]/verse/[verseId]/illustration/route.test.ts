import { expect, test } from "vitest";
import {
  InvalidVerseIllustrationRequestError,
  normalizeUuidParam,
} from "./route";

test("normalizeUuidParam accepts valid UUIDs and lowercases", () => {
  const uuid = "FD5B5F0C-5C0D-4FDF-AB3C-42CB22355F58";
  const normalized = normalizeUuidParam(uuid, "Song id");

  expect(normalized).toBe("fd5b5f0c-5c0d-4fdf-ab3c-42cb22355f58");
});

test("normalizeUuidParam rejects invalid UUID values", () => {
  const act = () => normalizeUuidParam("not-a-uuid", "Song id");
  expect(act).toThrowError(InvalidVerseIllustrationRequestError);
});
