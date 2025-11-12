import { describe, expect, test } from "vitest";
import {
  computeGroupSize,
  groupSongsByTitleRange,
} from "./song-title-range-grouping";

type SongStub = {
  readonly id: string;
  readonly title: string;
};

const buildSong = (title: string): SongStub => ({
  id: title.toLowerCase(),
  title,
});

describe("computeGroupSize", () => {
  test("returns total count when below target", () => {
    expect(computeGroupSize(5, 10)).toBe(5);
  });

  test("never returns less than 1 even when no items", () => {
    expect(computeGroupSize(0, 10)).toBe(1);
  });

  test("caps group sizes close to the target", () => {
    expect(computeGroupSize(25, 10)).toBe(9);
  });

  test("handles non-positive target values by falling back to 1", () => {
    expect(computeGroupSize(20, 0)).toBe(1);
  });
});

describe("groupSongsByTitleRange", () => {
  test("returns empty list when there are no songs", () => {
    const groups = groupSongsByTitleRange<SongStub>({
      songs: [],
      targetGroupSize: 5,
    });

    expect(groups).toEqual([]);
  });

  test("chunks songs into evenly sized alphabetical groups", () => {
    const songs: SongStub[] = [
      buildSong("Beta Song"),
      buildSong("Gamma Song"),
      buildSong("Alpha Song"),
      buildSong("Delta Song"),
      buildSong("Epsilon Song"),
    ];

    const groups = groupSongsByTitleRange<SongStub>({
      songs,
      targetGroupSize: 2,
    });

    expect(groups).toHaveLength(3);
    expect(groups[0]?.label).toBe("A - B");
    expect(groups[0]?.items.map((item) => item.title)).toEqual([
      "Alpha Song",
      "Beta Song",
    ]);
    expect(groups[1]?.label).toBe("D - E");
    expect(groups[1]?.items.map((item) => item.title)).toEqual([
      "Delta Song",
      "Epsilon Song",
    ]);
    expect(groups[2]?.label).toBe("G");
    expect(groups[2]?.items.map((item) => item.title)).toEqual(["Gamma Song"]);
  });

  test("respects Danish collation placing Æ, Ø, Å at the end", () => {
    const songs: SongStub[] = [
      buildSong("Åh abe"),
      buildSong("Æblemand"),
      buildSong("Alpha"),
      buildSong("Ørkenstorm"),
    ];

    const groups = groupSongsByTitleRange<SongStub>({
      songs,
      targetGroupSize: 10,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.title)).toEqual([
      "Alpha",
      "Æblemand",
      "Ørkenstorm",
      "Åh abe",
    ]);
  });

  test("uses first alphanumeric character to build labels", () => {
    const songs: SongStub[] = [
      buildSong("  123 Start"),
      buildSong('"Quoted Song"'),
      buildSong("Æpple"),
    ];

    const groups = groupSongsByTitleRange<SongStub>({
      songs,
      targetGroupSize: 10,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("Q - Æ");
    expect(groups[0]?.items.map((item) => item.title)).toEqual([
      '"Quoted Song"',
      "  123 Start",
      "Æpple",
    ]);
  });
});
