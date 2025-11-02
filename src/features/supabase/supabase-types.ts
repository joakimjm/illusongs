type CustomClaims = {
  email: string;
  oid: string;
  roles: string[];
  sid: string;
  tid: string;
};

type AppMetadata = {
  provider: string;
  providers: string[];
};

type UserMetadata = {
  custom_claims: CustomClaims;
  email: string;
  email_verified: boolean;
  full_name: string;
  iss: string;
  phone_verified: boolean;
  preferred_username: string;
  provider_id: string;
  sub: string;
};

type IdentityData = {
  custom_claims: CustomClaims;
  email: string;
  email_verified: boolean;
  full_name: string;
  iss: string;
  phone_verified: boolean;
  preferred_username: string;
  provider_id: string;
  sub: string;
};

type Identity = {
  identity_id: string;
  id: string;
  user_id: string;
  identity_data: IdentityData;
  provider: string;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
  email: string;
};

export type SupabaseUser = {
  id: string;
  aud: string;
  role: string;
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: AppMetadata;
  user_metadata: UserMetadata;
  identities: Identity[];
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
};
