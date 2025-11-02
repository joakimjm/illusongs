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
