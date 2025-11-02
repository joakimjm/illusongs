import { NextResponse } from "next/server";
import { createApiRoute } from "@/features/auth/api-handler";
import { isAdmin } from "@/features/auth/policies";
import {
  createForbiddenResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
} from "@/features/http/api-utils";
import { deleteAccessToken } from "@/features/tokens/token-commands";
import { TOKENS_MANAGED_BY_ADMINS_DETAIL } from "../constants";

const handleInternalError = (error: unknown, tokenId: string): Response => {
  const message =
    error instanceof Error ? error.message : "Unknown access token error";

  console.error(
    JSON.stringify({
      level: "error",
      event: "access_tokens_delete_failed",
      tokenId,
      message,
    }),
  );

  return createInternalServerErrorResponse("Unable to delete access token");
};

const isValidTokenId = (tokenId: string): boolean =>
  /^[0-9a-f-]{36}$/i.test(tokenId);

const handlers = createApiRoute<{ tokenId: string }>({
  DELETE: async ({ params, identity }) => {
    if (!isAdmin(identity)) {
      return createForbiddenResponse(TOKENS_MANAGED_BY_ADMINS_DETAIL);
    }

    const { tokenId } = params;

    if (!isValidTokenId(tokenId)) {
      return NextResponse.json(
        { ok: false, detail: "Invalid token id." },
        { status: 400 },
      );
    }

    try {
      const deleted = await deleteAccessToken(tokenId);

      if (!deleted) {
        return createNotFoundResponse("Access token not found.");
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      return handleInternalError(error, tokenId);
    }
  },
});

export const DELETE = handlers.DELETE;
