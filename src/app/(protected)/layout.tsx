import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  type NavigationSection,
  NavigationShell,
} from "@/components/navigation/navigation-shell";
import { APP_NAME } from "@/config/app";
import { isAdminUser } from "@/features/auth/policies";
import { getUser } from "@/features/supabase/server";

type ProtectedLayoutProps = {
  readonly children: ReactNode;
};

const ProtectedLayout = async ({ children }: ProtectedLayoutProps) => {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = isAdminUser(user);
  const sections: NavigationSection[] = [
    {
      id: "workspace",
      title: "Workspace",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          description: "Review activity across your project.",
        },
      ],
    },
  ];

  if (isAdmin) {
    sections.push({
      id: "admin",
      title: "Administration",
      items: [
        {
          href: "/admin/songs",
          label: "Songs",
          description:
            "Draft songs, queue illustrations, and publish when ready.",
        },
        {
          href: "/admin/jobs",
          label: "Illustration queue",
          description:
            "Monitor per-verse illustration jobs and retry failures.",
        },
        {
          href: "/admin/tokens",
          label: "Access tokens",
          description: "Issue and revoke API credentials.",
        },
      ],
    });
  }

  const headerTitle = isAdmin ? "Workspace & Administration" : "Workspace";
  const headerDescription = isAdmin
    ? "Switch between your workspace and the administrative tools."
    : "Access the tools available to your account.";

  return (
    <NavigationShell
      user={user}
      header={{
        eyebrow: APP_NAME,
        title: headerTitle,
        description: headerDescription,
      }}
      sections={sections}
    >
      {children}
    </NavigationShell>
  );
};

export default ProtectedLayout;
