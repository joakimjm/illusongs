import { describe, expect, test } from "vitest";
import {
  parseBooleanParam,
  parseSearchParam,
  parseSortParam,
} from "./search-params";

describe("parseBooleanParam", () => {
  test("returns default when no value is present", () => {
    expect(parseBooleanParam(undefined, true)).toBe(true);
    expect(parseBooleanParam(undefined, false)).toBe(false);
  });

  test("treats repeated params as checked when any true value is present", () => {
    expect(parseBooleanParam(["0", "1"], true)).toBe(true);
    expect(parseBooleanParam(["false", "true"], false)).toBe(true);
  });

  test("treats repeated params as unchecked when only false values are present", () => {
    expect(parseBooleanParam(["0"], true)).toBe(false);
    expect(parseBooleanParam(["false", "no"], true)).toBe(false);
  });
});

describe("parseSearchParam", () => {
  test("trims the first value", () => {
    expect(parseSearchParam([" moonlit ", "ignored"])).toBe("moonlit");
  });
});

describe("parseSortParam", () => {
  test("accepts supported sort values", () => {
    expect(parseSortParam("updated_desc")).toBe("updated_desc");
  });

  test("falls back to queue for unsupported values", () => {
    expect(parseSortParam("invalid")).toBe("queue");
  });
});
