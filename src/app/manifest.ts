import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

const manifest = (): MetadataRoute.Manifest => ({
  name: APP_NAME,
  short_name: "Illusongs",
  description: APP_DESCRIPTION,
  start_url: "/",
  display: "standalone",
  background_color: "#1b1009",
  theme_color: "#f3debc",
  lang: "en",
  icons: [
    {
      src: "/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/web-app-manifest-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
});

export default manifest;
