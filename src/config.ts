import { isUndefined } from "./utils";

export function getRequiredConfigValue(
  key: string,
  defaultValue?: string,
): string {
  const value = process.env[key];
  if (!isUndefined(value)) {
    return value;
  }

  if (!isUndefined(defaultValue)) {
    return defaultValue;
  }

  throw new Error(`Config error: Missing environment variable ${key}`);
}

const normalizeConfigValue = (value: string | undefined): string | null => {
  if (isUndefined(value)) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const TRUE_LITERALS: ReadonlySet<string> = new Set([
  "1",
  "true",
  "yes",
  "on",
  "enabled",
  "enable",
]);

export const isFeatureEnabled = (key: string): boolean => {
  const value = normalizeConfigValue(getRequiredConfigValue(key, ""));
  if (!value) {
    return false;
  }

  return TRUE_LITERALS.has(value.toLowerCase());
};
