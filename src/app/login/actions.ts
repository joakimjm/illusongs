"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/features/supabase/server";

const LOGIN_WITH_CREDS_ROUTE = "/login";
const LOGIN_ERROR_PARAM = "?error=signin_failed";
const LOGIN_SUCCESS_REDIRECT = "/";

type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  action:
    | "attempt"
    | "validation_failed"
    | "sign_in_failed"
    | "sign_in_succeeded";
  detail?: string;
  supabaseStatus?: number | null;
  supabaseErrorName?: string | null;
};

const logLoginEvent = (level: LogLevel, payload: LogPayload) => {
  const logger =
    level === "info"
      ? console.info
      : level === "warn"
        ? console.warn
        : console.error;

  logger(
    JSON.stringify({
      level,
      event: "login_with_creds",
      ...payload,
    }),
  );
};

const getEmail = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
};

const isNonEmptyString = (
  value: FormDataEntryValue | null,
): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  return value.length > 0;
};

export const loginWithCredentials = async (formData: FormData) => {
  const email = getEmail(formData.get("email"));
  const passwordEntry = formData.get("password");

  logLoginEvent("info", { action: "attempt" });

  if (!email || !isNonEmptyString(passwordEntry)) {
    logLoginEvent("warn", {
      action: "validation_failed",
      detail: "Missing or invalid credentials payload",
    });
    redirect(`${LOGIN_WITH_CREDS_ROUTE}${LOGIN_ERROR_PARAM}`);
  }

  const password = passwordEntry;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logLoginEvent("error", {
      action: "sign_in_failed",
      detail: "Supabase sign-in returned an error",
      supabaseStatus: error.status ?? null,
      supabaseErrorName: error.name ?? null,
    });
    redirect(`${LOGIN_WITH_CREDS_ROUTE}${LOGIN_ERROR_PARAM}`);
  }

  logLoginEvent("info", { action: "sign_in_succeeded" });
  redirect(LOGIN_SUCCESS_REDIRECT);
};
