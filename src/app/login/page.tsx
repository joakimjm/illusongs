import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body } from "@/components/typography";
import { createClient } from "@/features/supabase/server";
import { loginWithCredentials } from "./actions";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type SearchParams =
  | Promise<SearchParamsRecord>
  | SearchParamsRecord
  | undefined;

const EMPTY_SEARCH_PARAMS: SearchParamsRecord = {};

type LoginWithCredsPageProps = {
  searchParams?: SearchParams;
};

const toParamValue = (value?: string | string[]) => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0] ?? null;
  }

  return null;
};

const LoginWithCredsPage = async ({
  searchParams,
}: LoginWithCredsPageProps) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const resolvedSearchParams =
    (await Promise.resolve(searchParams)) ?? EMPTY_SEARCH_PARAMS;
  const errorCode = toParamValue(resolvedSearchParams?.error);
  const hasError = errorCode === "signin_failed";

  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <HeroHeader
          eyebrow="Illusongs"
          title="Sign in with credentials."
          description="Temporary access while Azure SSO configuration is completed."
        />
        <Panel>
          <form action={loginWithCredentials} className="flex flex-col gap-5">
            {hasError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm dark:border-red-900/60 dark:bg-red-950/40"
              >
                <Body size="sm" className="text-red-700 dark:text-red-300">
                  Unable to sign in with that email and password. Double-check
                  your credentials or contact support for assistance.
                </Body>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
              />
            </div>
            <Button type="submit">Sign in</Button>
            <Body size="xs" variant="muted">
              Remove this page once Azure single sign-on is ready for general
              use.
            </Body>
          </form>
        </Panel>
      </div>
    </PageShell>
  );
};

export default LoginWithCredsPage;
