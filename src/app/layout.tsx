import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";

import { ServiceWorker } from "@/components/pwa/service-worker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_DESCRIPTION, APP_KEYWORDS, APP_NAME, APP_TAGLINE, PRIVACY_COOKIE } from "@/lib/constants";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const siteUrl = env.siteUrl;
const title = `${APP_NAME} — ${APP_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  keywords: APP_KEYWORDS,
  applicationName: APP_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: APP_NAME,
    title,
    description: APP_DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description: APP_DESCRIPTION },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers renders every route per request, which the
  // nonce-based Content-Security-Policy from src/proxy.ts requires.
  await headers();
  const privacy = (await cookies()).get(PRIVACY_COOKIE)?.value === "on";

  return (
    <html lang="en" className={cn("dark", sans.variable, mono.variable)} data-privacy={privacy ? "on" : "off"}>
      <body className="min-h-svh">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <ServiceWorker />
        <Toaster position="top-center" offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }} />
      </body>
    </html>
  );
}
