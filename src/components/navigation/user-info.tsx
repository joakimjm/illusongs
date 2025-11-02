import Link from "next/link";
import type { SupabaseUser } from "@/features/supabase/supabase-types";
import { Body, SectionLabel } from "../typography";
import { Anchor } from "../typography/anchor";

export const UserInfo = ({ user }: { user: SupabaseUser }) => {
  const displayName =
    (typeof user.user_metadata.full_name === "string" &&
    user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : null) ??
    user.email ??
    user.id;

  return (
    <div>
      <SectionLabel>Signed in as</SectionLabel>
      <h3 className="mt-1 text-sm font-bold">{displayName}</h3>
      {user.email ? <Body size="xs">{user.email}</Body> : null}
      <Anchor
        as={Link}
        prefetch={false}
        href="/api/auth/signout"
        className="text-xs"
      >
        Sign out
        <span aria-hidden>→</span>
      </Anchor>
    </div>
  );
};
