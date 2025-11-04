import { getRequiredConfigValue } from "@/config";
import type { AccessTokenPermission } from "@/features/tokens/token-types";
import { AccessTokenPermissions } from "@/features/tokens/token-types";
import type { SupabaseUser } from "../supabase/supabase-types";
import type {
  ServerIdentity,
  SupabaseIdentity,
  TokenIdentity,
} from "./server-identity";

const isSupabaseIdentity = (
  identity: ServerIdentity,
): identity is SupabaseIdentity => identity.type === "supabase";

export const isTokenIdentity = (
  identity: ServerIdentity,
): identity is TokenIdentity => identity.type === "access-token";

export const isAdminUser = (user: SupabaseUser): boolean =>
  user.email === getRequiredConfigValue("ADMIN_EMAIL");

const hasAccessTokenPermission = (
  identity: ServerIdentity,
  permission: AccessTokenPermission,
): boolean =>
  isTokenIdentity(identity) && identity.permissions.includes(permission);

export const isAdmin = (identity: ServerIdentity): boolean => {
  if (isSupabaseIdentity(identity)) {
    return isAdminUser(identity.user);
  }

  if (
    hasAccessTokenPermission(identity, AccessTokenPermissions.Administrator)
  ) {
    return true;
  }

  return false;
};
