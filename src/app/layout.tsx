import type { Metadata, Viewport } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const headingFont = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

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
  <html
    lang="en"
    className={`${bodyFont.variable} ${headingFont.variable}`}
    suppressHydrationWarning
  >
    <body className="min-h-screen bg-amber-50 font-body text-stone-900 antialiased selection:bg-amber-200 selection:text-amber-900 dark:bg-slate-950 dark:text-stone-100">
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;
