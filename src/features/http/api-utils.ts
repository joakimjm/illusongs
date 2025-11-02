import { NextResponse } from "next/server";

type ApiErrorDetail = {
  ok: false;
  detail: string;
};

export const logAndRespondWithError = (
  event: string,
  error: unknown,
  fallbackDetail: string,
  logLevel: "error" | "warn" = "error",
) => {
  const message = error instanceof Error ? error.message : "Unknown error";

  console[logLevel](
    JSON.stringify({
      level: logLevel,
      event,
      message,
    }),
  );

  const payload: ApiErrorDetail = { ok: false, detail: fallbackDetail };
  return NextResponse.json(payload, { status: 500 });
};

export const createForbiddenResponse = (detail?: string): Response =>
  NextResponse.json(
    {
      ok: false,
      detail: detail ?? "You do not have permission to access this resource.",
    },
    { status: 403 },
  );

export const createInternalServerErrorResponse = (detail?: string): Response =>
  NextResponse.json(
    {
      ok: false,
      detail: detail ?? "An internal server error occurred.",
    },
    { status: 500 },
  );

export const createNotFoundResponse = (detail?: string): Response =>
  NextResponse.json(
    {
      ok: false,
      detail: detail ?? "The requested resource was not found.",
    },
    { status: 404 },
  );

export const createBadRequestResponse = (detail?: string): Response =>
  NextResponse.json(
    {
      ok: false,
      detail: detail ?? "The request was invalid or cannot be served.",
    },
    { status: 400 },
  );

export const createOkResponse = (): Response =>
  NextResponse.json(
    {
      ok: true,
    },
    { status: 200 },
  );

export const createConflictResponse = (detail?: string): Response =>
  NextResponse.json(
    {
      ok: false,
      detail: detail ?? "The request could not be completed due to a conflict.",
    },
    { status: 409 },
  );
