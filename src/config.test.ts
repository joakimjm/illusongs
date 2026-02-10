import { afterEach, describe, expect, it } from "vitest";
import { getRequiredConfigValue } from "./config";

const TEST_ENV_KEY = "ILLUSONGS_TEST_ENV_KEY";

afterEach(() => {
  delete process.env[TEST_ENV_KEY];
});

describe("getRequiredConfigValue", () => {
  it("returns the environment value when present", () => {
    process.env[TEST_ENV_KEY] = "example-value";

    expect(getRequiredConfigValue(TEST_ENV_KEY)).toBe("example-value");
  });

  it("returns the provided default when the environment value is missing", () => {
    expect(getRequiredConfigValue(TEST_ENV_KEY, "fallback-value")).toBe(
      "fallback-value",
    );
  });

  it("throws when the value is missing and no default is provided", () => {
    expect(() => getRequiredConfigValue(TEST_ENV_KEY)).toThrow(
      `Config error: Missing environment variable ${TEST_ENV_KEY}`,
    );
  });
});
