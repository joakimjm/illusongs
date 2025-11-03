import { Karla, Zilla_Slab } from "next/font/google";

export const bodyFont = Karla({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const headingFont = Zilla_Slab({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["400", "600", "700"],
});
