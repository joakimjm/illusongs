import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequiredConfigValue } from "@/config";

const STORAGE_ACCESS_TOKEN_KEY = "SUPABASE_STORAGE_ACCESS_TOKEN";

let storageClient: SupabaseClient | null = null;

export const getSupabaseStorageClient = (): SupabaseClient => {
  if (storageClient) {
    return storageClient;
  }

  const accessToken = getRequiredConfigValue(STORAGE_ACCESS_TOKEN_KEY);
  storageClient = createClient(
    getRequiredConfigValue("SUPABASE_URL"),
    accessToken,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );

  return storageClient;
};
