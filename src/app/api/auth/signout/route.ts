import { NextResponse } from "next/server";
import { createClient } from "@/features/supabase/server";

export const GET = async (request: Request) => {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  await supabase.auth.signOut();
  // return the user to frontpage
  return NextResponse.redirect(`${origin}/`);
};
