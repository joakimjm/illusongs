import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import {
  getAppleStartupImageMedia,
  getPwaStartupImageHref,
  PWA_STARTUP_IMAGE_TARGETS,
} from "@/config/pwa-startup-images";
import { bodyFont } from "@/styles/fonts";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
    <head>
      {PWA_STARTUP_IMAGE_TARGETS.map((target) => (
        <link
          key={getPwaStartupImageHref(target)}
          rel="apple-touch-startup-image"
          href={getPwaStartupImageHref(target)}
          media={getAppleStartupImageMedia(target)}
        />
      ))}
    </head>
    <body
      className={`${bodyFont.className} min-h-screen bg-amber-50 text-stone-900 antialiased selection:bg-amber-200 selection:text-amber-900 dark:bg-slate-950 dark:text-stone-100`}
    >
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;
