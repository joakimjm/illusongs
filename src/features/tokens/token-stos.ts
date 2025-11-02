export type AccessTokenSto = {
  id: string;
  label: string;
  token_last_four: string;
  created_by: string;
  created_at: Date;
  last_used_at: Date | null;
};

export type AccessTokenWithPermissionsSto = AccessTokenSto & {
  permissions: readonly string[];
};

export type AccessTokenWithHashSto = AccessTokenSto & {
  token_hash: Buffer;
};

export type AccessTokenWithHashAndPermissionsSto = AccessTokenWithHashSto & {
  permissions: readonly string[];
};
