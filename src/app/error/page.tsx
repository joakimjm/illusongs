import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Body, Strong } from "@/components/typography";
import { APP_NAME } from "@/config/app";

const ErrorPage = () => (
  <PageShell>
    <HeroHeader
      eyebrow={APP_NAME}
      title="Something went wrong."
      description="We could not complete your request. Please refresh the page or return to the workspace and try again."
    />
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
      <Body>
        <Strong>
          If the issue persists, share the steps and request ID with your
          engineering team so they can investigate.
        </Strong>
      </Body>
      <Body>
        <Strong>We will restore service as quickly as possible.</Strong>
      </Body>
    </div>
  </PageShell>
);

export default ErrorPage;
