import type {
  AccessTokenDto,
  AccessTokenPermission,
} from "@/features/tokens/token-types";
import { isAccessTokenPermission } from "@/features/tokens/token-types";
import type { AccessTokenWithPermissionsSto } from "./token-stos";

export const mapPermissionsOrThrow = (
  permissions: readonly string[],
): AccessTokenPermission[] => {
  const mapped: AccessTokenPermission[] = [];
  permissions.forEach((permission) => {
    if (!isAccessTokenPermission(permission)) {
      throw new Error(`Unknown access token permission: ${permission}`);
    }
    mapped.push(permission);
  });
  return mapped;
};

export const mapAccessTokenStoToDto = (
  token: AccessTokenWithPermissionsSto,
): AccessTokenDto => ({
  id: token.id,
  label: token.label,
  lastFour: token.token_last_four,
  createdBy: token.created_by,
  createdAt: token.created_at.toISOString(),
  lastUsedAt: token.last_used_at ? token.last_used_at.toISOString() : null,
  permissions: mapPermissionsOrThrow(token.permissions),
});
