import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading, Strong } from "@/components/typography";
import { getUser } from "@/features/supabase/server";

const DashboardPage = async () => {
  const user = await getUser();

  return (
    <PageShell variant="embedded">
      <HeroHeader
        title="Welcome to your workspace."
        description="This dashboard is intentionally minimal—extend it to reflect your product's needs."
      />

      <div className="flex flex-col gap-8">
        <Panel className="flex flex-col gap-3">
          <Heading level={2} className="text-base">
            Getting started
          </Heading>
          <Body size="sm">
            Replace this page with the metrics, tables, or workflows that matter
            for your new project. The surrounding layout, authentication guard,
            and Supabase session handling are already configured.
          </Body>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <Heading level={2} className="text-base">
            Helpful references
          </Heading>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
            <li>
              <Strong>Access tokens</Strong> — issue programmatic credentials
              under <code>/admin/tokens</code>.
            </li>
            <li>
              <Strong>Database</Strong> — edit the SQL files in
              <code className="mx-1 rounded bg-slate-900 px-1.5 py-0.5 text-xs text-slate-100 dark:bg-slate-950">
                migrations/
              </code>
              and run tests with the bundled harness.
            </li>
            <li>
              <Strong>Policies</Strong> — update
              <code className="mx-1 rounded bg-slate-900 px-1.5 py-0.5 text-xs text-slate-100 dark:bg-slate-950">
                src/features/auth
              </code>
              to reflect your roles and token permissions.
            </li>
          </ul>
        </Panel>

        {user ? (
          <Panel className="flex flex-col gap-2">
            <Heading level={2} className="text-base">
              Signed-in user
            </Heading>
            <Body size="sm">
              <Strong>Email:</Strong> {user.email ?? "Unknown"}
            </Body>
          </Panel>
        ) : null}
      </div>
    </PageShell>
  );
};

export default DashboardPage;
