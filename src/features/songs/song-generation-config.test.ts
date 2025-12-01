import { afterEach, beforeEach, expect, test } from "vitest";
import {
  getOpenAiImageApiKey,
  getOpenAiImageModel,
  getOpenAiImageQuality,
  getOpenAiImageSize,
  isOpenAiImageGenerationEnabled,
} from "./song-generation-config";

const MANAGED_ENV_KEYS = [
  "FEATURE_OPENAI_IMAGE_API",
  "OPENAI_IMAGE_SIZE",
  "OPENAI_IMAGE_QUALITY",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_API_KEY",
] as const;

type ManagedKey = (typeof MANAGED_ENV_KEYS)[number];

const snapshotEnv = (): Record<ManagedKey, string | undefined> => {
  const snapshot: Partial<Record<ManagedKey, string | undefined>> = {};
  for (const key of MANAGED_ENV_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot as Record<ManagedKey, string | undefined>;
};

const restoreEnv = (snapshot: Record<ManagedKey, string | undefined>): void => {
  for (const key of MANAGED_ENV_KEYS) {
    const value = snapshot[key];
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
};

const setEnv = (key: ManagedKey, value: string | null): void => {
  if (value === null) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

let envSnapshot: Record<ManagedKey, string | undefined>;

beforeEach(() => {
  envSnapshot = snapshotEnv();
  for (const key of MANAGED_ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  restoreEnv(envSnapshot);
});

test("isOpenAiImageGenerationEnabled respects truthy values", () => {
  expect(isOpenAiImageGenerationEnabled()).toBe(false);

  setEnv("FEATURE_OPENAI_IMAGE_API", "1");
  expect(isOpenAiImageGenerationEnabled()).toBe(true);

  setEnv("FEATURE_OPENAI_IMAGE_API", "yes");
  expect(isOpenAiImageGenerationEnabled()).toBe(true);

  setEnv("FEATURE_OPENAI_IMAGE_API", "off");
  expect(isOpenAiImageGenerationEnabled()).toBe(false);
});

test("getOpenAiImageSize enforces allowed values", () => {
  expect(getOpenAiImageSize()).toBe("1024x1536");

  setEnv("OPENAI_IMAGE_SIZE", "1792x1024");
  expect(getOpenAiImageSize()).toBe("1792x1024");

  setEnv("OPENAI_IMAGE_SIZE", "invalid");
  expect(getOpenAiImageSize()).toBe("1024x1536");
});

test("getOpenAiImageQuality returns supported quality options", () => {
  expect(getOpenAiImageQuality()).toBe("high");

  setEnv("OPENAI_IMAGE_QUALITY", "medium");
  expect(getOpenAiImageQuality()).toBe("medium");

  setEnv("OPENAI_IMAGE_QUALITY", "hd");
  expect(getOpenAiImageQuality()).toBe("hd");

  setEnv("OPENAI_IMAGE_QUALITY", "ultra");
  expect(getOpenAiImageQuality()).toBe("high");
});

test("getOpenAiImageModel returns configured model or default", () => {
  expect(getOpenAiImageModel()).toBe("gpt-image-1");

  setEnv("OPENAI_IMAGE_MODEL", "dall-e-3");
  expect(getOpenAiImageModel()).toBe("dall-e-3");
});

test("getOpenAiImageApiKey reads required secret", () => {
  setEnv("OPENAI_API_KEY", "test-key");
  expect(getOpenAiImageApiKey()).toBe("test-key");
});
