import { NextResponse } from "next/server";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import { extractCreatedBy } from "@/features/auth/server-identity";
import {
  createBadRequestResponse,
  createForbiddenResponse,
  logAndRespondWithError,
} from "@/features/http/api-utils";
import {
  type CreateAccessTokenInput,
  createAccessToken,
} from "@/features/tokens/token-commands";
import { fetchAccessTokens } from "@/features/tokens/token-queries";
import {
  type AccessTokenPermission,
  isAccessTokenPermission,
} from "@/features/tokens/token-types";
import { isRecord } from "@/utils";
import { TOKENS_MANAGED_BY_ADMINS_DETAIL } from "./constants";

export class InvalidTokenRequestError extends Error {}

type CreateTokenPayload = {
  label: string;
  permissions: AccessTokenPermission[];
};

export const parseCreatePayload = (payload: unknown): CreateTokenPayload => {
  if (!isRecord(payload)) {
    throw new InvalidTokenRequestError("Payload must be a JSON object.");
  }

  const { label, permissions } = payload;

  if (typeof label !== "string" || label.trim().length === 0) {
    throw new InvalidTokenRequestError("Token label is required.");
  }

  const permissionsValue = permissions ?? [];
  if (!Array.isArray(permissionsValue)) {
    throw new InvalidTokenRequestError(
      "Token permissions must be provided as an array.",
    );
  }

  const normalizedPermissions: AccessTokenPermission[] = [];
  permissionsValue.forEach((permission) => {
    if (
      typeof permission !== "string" ||
      !isAccessTokenPermission(permission) ||
      normalizedPermissions.includes(permission)
    ) {
      if (
        typeof permission !== "string" ||
        !isAccessTokenPermission(permission)
      ) {
        throw new InvalidTokenRequestError(
          "Invalid token permission provided.",
        );
      }
      return;
    }
    normalizedPermissions.push(permission);
  });

  return {
    label: label.trim(),
    permissions: normalizedPermissions,
  };
};

const handlers = createApiRoute({
  GET: async ({ identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(TOKENS_MANAGED_BY_ADMINS_DETAIL);
    }

    try {
      const tokens = await fetchAccessTokens();
      return NextResponse.json({ tokens });
    } catch (error) {
      return logAndRespondWithError(
        "access_tokens_fetch_failed",
        error,
        "Unable to fetch access tokens",
      );
    }
  },
  POST: async ({ request, identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(TOKENS_MANAGED_BY_ADMINS_DETAIL);
    }

    try {
      const payload = parseCreatePayload(await request.json());
      const input: CreateAccessTokenInput = {
        label: payload.label,
        createdBy: extractCreatedBy(identity),
        permissions: payload.permissions,
      };

      const { token, accessToken } = await createAccessToken(input);
      return NextResponse.json({
        token,
        accessToken,
      });
    } catch (error) {
      if (error instanceof InvalidTokenRequestError) {
        return createBadRequestResponse(error.message);
      }

      return logAndRespondWithError(
        "access_tokens_create_failed",
        error,
        "Unable to create access token",
      );
    }
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
