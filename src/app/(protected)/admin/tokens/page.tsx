import { Suspense } from "react";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Body } from "@/components/typography";
import { APP_NAME } from "@/config/app";
import { TokensSection } from "./tokens-section";

const TokensPage = () => (
  <PageShell>
    <HeroHeader
      eyebrow={APP_NAME}
      title="Access tokens"
      description="Issue programmatic credentials and review existing tokens."
    />

    <Suspense
      fallback={<Body className="sm:text-base">Loading access tokens…</Body>}
    >
      <TokensSection />
    </Suspense>
  </PageShell>
);

export default TokensPage;
