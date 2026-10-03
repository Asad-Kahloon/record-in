import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { THEME_COLOR } from "@/lib/theme";

// Lets you "Add to Home Screen" on iPhone and open the app full-screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    // Light is the default theme; the page itself switches theme-color for dark.
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    categories: ["finance", "productivity"],
    shortcuts: [
      { name: "Aims", short_name: "Aims", url: "/goals" },
      { name: "Transactions", short_name: "Activity", url: "/transactions" },
      { name: "Reports", short_name: "Reports", url: "/reports" },
    ],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
