import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { isAdminUser } from "@/features/auth/policies";
import { getUser } from "@/features/supabase/server";

type AdminLayoutProps = PropsWithChildren;

const AdminLayout = async ({ children }: AdminLayoutProps) => {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
};

export default AdminLayout;
