import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// Public pages are indexable; everything behind sign-in is not.
export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/transactions",
          "/expenses",
          "/income",
          "/debts",
          "/budgets",
          "/reports",
          "/notifications",
          "/profile",
          "/admin",
          "/welcome",
          "/suspended",
          "/reset-password",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
