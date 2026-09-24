import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_DESCRIPTION, APP_NAME, PRIVACY_COOKIE } from "@/lib/constants";
import { cn } from "@/lib/utils";

import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  // Private app: keep it out of search engines.
  robots: { index: false, follow: false },
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
        <Toaster position="top-center" offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }} />
      </body>
    </html>
  );
}
