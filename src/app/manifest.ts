import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

// Lets you "Add to Home Screen" on iPhone and open the app full-screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Expense Tracker`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0d",
    theme_color: "#0a0a0d",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
