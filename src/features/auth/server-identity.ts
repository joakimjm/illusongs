import type { NextRequest } from "next/server";
import { getUser } from "@/features/supabase/server";
import type { SupabaseUser } from "@/features/supabase/supabase-types";
import {
  hashAccessToken,
  recordAccessTokenUse,
} from "@/features/tokens/token-commands";
import { findAccessTokenByHash } from "@/features/tokens/token-queries";
import type { AccessTokenPermission } from "@/features/tokens/token-types";

export type SupabaseIdentity = {
  type: "supabase";
  user: SupabaseUser;
};

export type TokenIdentity = {
  type: "access-token";
  tokenId: string;
  label: string;
  createdBy: string;
  lastFour: string;
  permissions: AccessTokenPermission[];
};

export type ServerIdentity = SupabaseIdentity | TokenIdentity;

export const extractCreatedBy = (identity: ServerIdentity): string => {
  if (identity.type === "supabase") {
    const { user } = identity;
    const email = user.email?.trim();
    if (email && email.length > 0) {
      return email;
    }

    const preferredUsername = user.user_metadata.preferred_username?.trim();
    if (preferredUsername && preferredUsername.length > 0) {
      return preferredUsername;
    }

    return user.id;
  }

  return identity.createdBy;
};

const AUTHORIZATION_HEADER = "authorization";
const BEARER_PREFIX = "bearer ";

const extractAccessToken = (request: Request | NextRequest): string | null => {
  const headerValue = request.headers.get(AUTHORIZATION_HEADER);
  if (!headerValue) {
    return null;
  }

  const lowerCased = headerValue.trim().toLowerCase();
  if (!lowerCased.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = headerValue.slice(BEARER_PREFIX.length);
  return token.trim().length > 0 ? token.trim() : null;
};

const resolveTokenIdentity = async (
  bearerToken: string,
): Promise<TokenIdentity | null> => {
  const tokenHash = hashAccessToken(bearerToken);
  const accessToken = await findAccessTokenByHash(tokenHash);

  if (!accessToken) {
    return null;
  }

  await recordAccessTokenUse(accessToken.id);

  return {
    type: "access-token",
    tokenId: accessToken.id,
    label: accessToken.label,
    createdBy: accessToken.createdBy,
    lastFour: accessToken.lastFour,
    permissions: accessToken.permissions,
  };
};

export const resolveServerIdentity = async (
  request: Request | NextRequest,
): Promise<ServerIdentity | null> => {
  const user = await getUser();
  if (user) {
    return {
      type: "supabase",
      user,
    };
  }

  const bearerToken = extractAccessToken(request);

  if (!bearerToken) {
    return null;
  }

  return await resolveTokenIdentity(bearerToken);
};
