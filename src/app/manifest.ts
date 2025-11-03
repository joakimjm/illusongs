import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

const manifest = (): MetadataRoute.Manifest => ({
  name: APP_NAME,
  short_name: "Illusongs",
  description: APP_DESCRIPTION,
  start_url: "/",
  display: "standalone",
  background_color: "#1e1914",
  theme_color: "#f3debc",
  lang: "en",
  icons: [
    {
      src: "/icons/songbook-icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
  ],
});

export default manifest;
