import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

type RootLayoutProps = {
  readonly children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-200 selection:text-blue-900 dark:bg-slate-950 dark:text-slate-100">
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;
