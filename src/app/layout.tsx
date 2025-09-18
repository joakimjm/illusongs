import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Illustrerede Børnesange",
    template: "%s · Illustrerede Børnesange",
  },
  description: "Illustrerede danske børnesange til fællessang og hygge.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050914",
};

type RootLayoutProps = {
  readonly children: React.ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="da">
    <body
      className={`${geistSans.variable} ${geistMono.variable} bg-gradient-to-b from-amber-100 via-orange-50 to-rose-50 text-slate-900 antialiased`}
    >
      <div className="min-h-screen">{children}</div>
    </body>
  </html>
);

export default RootLayout;
