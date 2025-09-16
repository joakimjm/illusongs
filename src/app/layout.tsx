import type { Metadata } from "next";
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
    default: "Illusongs",
    template: "%s · Illusongs",
  },
  description: "Illustrerede danske børnesange til fællessang og hygge.",
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
