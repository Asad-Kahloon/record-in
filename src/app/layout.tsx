import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";

import { ThemeProvider } from "@/components/providers/theme";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  APP_DESCRIPTION,
  APP_KEYWORDS,
  APP_NAME,
  APP_TAGLINE,
  PRIVACY_COOKIE,
} from "@/lib/constants";
import { getProfile } from "@/lib/data";
import { env } from "@/lib/env";
import { DEFAULT_THEME, isTheme, THEME_COLOR, THEME_COOKIE, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const siteUrl = env.siteUrl;
const title = `${APP_NAME} — ${APP_TAGLINE}`;

/**
 * Signed in: the theme saved on the account, so it follows the user to every
 * device. Signed out: this device's choice. Otherwise light.
 *
 * A brand-new account still on the welcome screen hasn't chosen yet (its saved
 * value is only the default), so the device's choice wins there and becomes
 * the pre-selected answer on the theme step.
 */
async function resolveTheme(): Promise<Theme> {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  const device = isTheme(saved) ? saved : null;
  try {
    const profile = await getProfile();
    if (profile && isTheme(profile.theme)) {
      return !profile.currency && device ? device : profile.theme;
    }
  } catch {
    // A database hiccup must never break public pages; fall back to the cookie.
  }
  return device ?? DEFAULT_THEME;
}

const baseMetadata: Metadata = {
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
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true },
};

export async function generateMetadata(): Promise<Metadata> {
  const theme = await resolveTheme();
  return {
    ...baseMetadata,
    appleWebApp: {
      capable: true,
      title: APP_NAME,
      // Read when the home-screen app launches: white status-bar text over the
      // dark app, dark text on a light bar for the light one.
      statusBarStyle: theme === "dark" ? "black-translucent" : "default",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await resolveTheme();
  return {
    themeColor: THEME_COLOR[theme],
    colorScheme: theme,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading request headers renders every route per request, which the
  // nonce-based Content-Security-Policy from src/proxy.ts requires.
  await headers();
  const privacy = (await cookies()).get(PRIVACY_COOKIE)?.value === "on";
  const theme = await resolveTheme();

  return (
    <html
      lang="en"
      className={cn(theme === "dark" && "dark", sans.variable, mono.variable)}
      data-privacy={privacy ? "on" : "off"}
    >
      <body className="min-h-svh">
        <ThemeProvider initialTheme={theme}>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <ServiceWorker />
          <Toaster
            position="top-center"
            offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
          />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
