export const AccessTokenPermissions = {
  Administrator: "administrator",
} as const;

export type AccessTokenPermission =
  (typeof AccessTokenPermissions)[keyof typeof AccessTokenPermissions];

export const isAccessTokenPermission = (
  value: string,
): value is AccessTokenPermission =>
  value === AccessTokenPermissions.Administrator;

export const ACCESS_TOKEN_PERMISSION_LABELS: Record<
  AccessTokenPermission,
  string
> = {
  [AccessTokenPermissions.Administrator]: "Administrator",
};

export type AccessTokenDto = {
  id: string;
  label: string;
  lastFour: string;
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  permissions: AccessTokenPermission[];
};

export type AccessTokenWithSecretDto = AccessTokenDto & {
  token: string;
};
