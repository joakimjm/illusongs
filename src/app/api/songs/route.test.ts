import { describe, expect, it } from "vitest";
import {
  InvalidSongRequestError,
  parseCreateSongPayload,
} from "./route";

const createPayload = () => ({
  id: "jeg-har-fanget-mig-en-myg",
  title: "Jeg har fanget mig en myg",
  tags: ["dyr", "humoristisk"],
  isPublished: true,
  verses: [
    {
      id: 1,
      text: "Vers 1",
      illustration: "/vers-1.png",
    },
    {
      id: 2,
      text: "Vers 2",
    },
  ],
});

describe("parseCreateSongPayload", () => {
  it("parses valid payload and normalizes values", () => {
    const payload = parseCreateSongPayload(createPayload());

    expect(payload.slug).toBe("jeg-har-fanget-mig-en-myg");
    expect(payload.languageCode).toBe("da");
    expect(payload.tags).toEqual(["dyr", "humoristisk"]);
    expect(payload.verses).toHaveLength(2);
    expect(payload.verses[0]?.sequenceNumber).toBe(1);
    expect(payload.verses[0]?.illustrationUrl).toBe("/vers-1.png");
  });

  it("throws when payload is not an object", () => {
    const act = () => parseCreateSongPayload(null);
    expect(act).toThrowError(InvalidSongRequestError);
  });

  it("throws when slug is missing", () => {
    const payload = { ...createPayload(), id: " " };
    const act = () => parseCreateSongPayload(payload);
    expect(act).toThrowError("Song slug is required.");
  });

  it("throws when verses are missing", () => {
    const payload = { ...createPayload(), verses: [] };
    const act = () => parseCreateSongPayload(payload);
    expect(act).toThrowError("Song requires at least one verse.");
  });

  it("throws when verse sequence number is invalid", () => {
    const payload = {
      ...createPayload(),
      verses: [
        {
          id: 0,
          text: "Vers",
        },
      ],
    };
    const act = () => parseCreateSongPayload(payload);
    expect(act).toThrowError(
      "Verse at index 0 must have a sequence number greater than zero.",
    );
  });
});
