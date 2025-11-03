import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { bodyFont } from "@/styles/fonts";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3debc" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1009" },
  ],
};

type RootLayoutProps = {
  readonly children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body
      className={`${bodyFont.className} min-h-screen bg-amber-50 text-stone-900 antialiased selection:bg-amber-200 selection:text-amber-900 dark:bg-slate-950 dark:text-stone-100`}
    >
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;
