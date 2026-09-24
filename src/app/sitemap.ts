import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl;
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/signup`, lastModified, changeFrequency: "yearly", priority: 0.8 },
    { url: `${base}/login`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
