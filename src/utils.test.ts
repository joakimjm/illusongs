import { expect, test } from "vitest";
import { isRecord } from "./utils";

test("isRecord returns true for plain objects", () => {
  expect(isRecord({ key: "value" })).toBe(true);
  expect(isRecord(Object.create(null))).toBe(true);
});

test("isRecord returns false for arrays, null, and primitives", () => {
  expect(isRecord([1, 2, 3])).toBe(false);
  expect(isRecord(null)).toBe(false);
  expect(isRecord("string")).toBe(false);
  expect(isRecord(42)).toBe(false);
  expect(isRecord(undefined)).toBe(false);
});
