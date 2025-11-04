import { expect, test } from "vitest";
import {
  InvalidSongDraftRequestError,
  parseCreateSongDraftPayload,
} from "./route";

test("parseCreateSongDraftPayload accepts valid payload", () => {
  const payload = parseCreateSongDraftPayload({
    title: "Ny Sang",
    verses: "Vers 1\n\nVers 2",
    tags: ["Barnlig", "Rolig"],
    languageCode: "da",
  });

  expect(payload.title).toBe("Ny Sang");
  expect(payload.verses).toBe("Vers 1\n\nVers 2");
  expect(payload.tags).toEqual(["Barnlig", "Rolig"]);
  expect(payload.languageCode).toBe("da");
});

test("parseCreateSongDraftPayload requires title and verses", () => {
  expect(() => parseCreateSongDraftPayload({ verses: "" })).toThrowError(
    InvalidSongDraftRequestError,
  );

  expect(() => parseCreateSongDraftPayload({ title: "Hej" })).toThrowError(
    InvalidSongDraftRequestError,
  );
});
