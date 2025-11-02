import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequiredConfigValue } from "@/config";
import type { SupabaseUser } from "./supabase-types";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredConfigValue("SUPABASE_URL"),
    getRequiredConfigValue("SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

export const getUser = async (): Promise<SupabaseUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user as SupabaseUser | null;
};
