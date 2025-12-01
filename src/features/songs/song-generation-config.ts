import { getRequiredConfigValue, isFeatureEnabled } from "@/config";

const OPENAI_IMAGE_SIZES = [
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "1792x1024",
  "1024x1792",
  "512x512",
  "256x256",
] as const;

export type OpenAiImageSize = (typeof OPENAI_IMAGE_SIZES)[number];

const OPENAI_IMAGE_QUALITIES = [
  "auto",
  "standard",
  "hd",
  "low",
  "medium",
  "high",
] as const;

export type OpenAiImageQuality = (typeof OPENAI_IMAGE_QUALITIES)[number];

const OPENAI_DEFAULT_IMAGE_MODEL = "gpt-image-1";
const OPENAI_DEFAULT_IMAGE_SIZE: OpenAiImageSize = "1024x1536";
const OPENAI_DEFAULT_IMAGE_QUALITY: OpenAiImageQuality = "high";

const pickOrDefault = <TValue extends string>(
  value: string | null,
  allowed: ReadonlyArray<TValue>,
  fallback: TValue,
): TValue => {
  if (value === null) {
    return fallback;
  }

  for (const candidate of allowed) {
    if (candidate === value) {
      return candidate;
    }
  }

  return fallback;
};

export const isOpenAiImageGenerationEnabled = (): boolean =>
  isFeatureEnabled("FEATURE_OPENAI_IMAGE_API");

export const getOpenAiImageApiKey = (): string =>
  getRequiredConfigValue("OPENAI_API_KEY");

export const getOpenAiImageModel = (): string => {
  const value = getRequiredConfigValue(
    "OPENAI_IMAGE_MODEL",
    OPENAI_DEFAULT_IMAGE_MODEL,
  ).trim();
  return value.length > 0 ? value : OPENAI_DEFAULT_IMAGE_MODEL;
};

export const getOpenAiImageSize = (): OpenAiImageSize =>
  pickOrDefault(
    (() => {
      const value = getRequiredConfigValue(
        "OPENAI_IMAGE_SIZE",
        OPENAI_DEFAULT_IMAGE_SIZE,
      ).trim();
      return value.length > 0 ? value : null;
    })(),
    OPENAI_IMAGE_SIZES,
    OPENAI_DEFAULT_IMAGE_SIZE,
  );

export const getOpenAiImageQuality = (): OpenAiImageQuality =>
  pickOrDefault(
    (() => {
      const value = getRequiredConfigValue(
        "OPENAI_IMAGE_QUALITY",
        OPENAI_DEFAULT_IMAGE_QUALITY,
      ).trim();
      return value.length > 0 ? value : null;
    })(),
    OPENAI_IMAGE_QUALITIES,
    OPENAI_DEFAULT_IMAGE_QUALITY,
  );
