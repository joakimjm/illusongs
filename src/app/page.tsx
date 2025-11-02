import Link from "next/link";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Strong } from "@/components/typography";
import { Anchor } from "@/components/typography/anchor";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { isAdminUser } from "@/features/auth/policies";
import { getUser } from "@/features/supabase/server";

const HomePage = async () => {
  const user = await getUser();
  const isAdmin = user ? isAdminUser(user) : false;

  return (
    <PageShell>
      <HeroHeader
        eyebrow={APP_NAME}
        title="Kickstart your secure internal tools."
        description={APP_DESCRIPTION}
      />

      <Panel as="ul" className="grid gap-3 list-disc pl-10">
        <li>
          <Body>
            Supabase Auth (Azure) session handling already wired into Next.js
            Server Components.
          </Body>
        </li>
        <li>
          <Body>
            PostgreSQL migrations, Docker Compose, and a Vitest-powered database
            harness for confident iteration.
          </Body>
        </li>
        <li>
          <Body>
            Access token issuance with API routes, UI, and role-aware
            authorization policies.
          </Body>
        </li>
      </Panel>

      {user ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <Strong>You are signed in.</Strong>
          <Anchor as={Link} href="/dashboard">
            Open workspace
            <span aria-hidden>→</span>
          </Anchor>
          {isAdmin ? (
            <Anchor as={Link} href="/admin/tokens">
              Manage access tokens
              <span aria-hidden>→</span>
            </Anchor>
          ) : null}
        </div>
      ) : (
        <Anchor as={Link} href="/login">
          Sign in to get started
          <span aria-hidden>→</span>
        </Anchor>
      )}
    </PageShell>
  );
};

export default HomePage;
