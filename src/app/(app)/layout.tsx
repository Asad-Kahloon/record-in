import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import type { ShellUser } from "@/components/nav-items";
import { AppConfigProvider } from "@/components/providers/app-config";
import { EntrySheetsProvider } from "@/components/providers/entry-sheets";
import { PrivacyProvider } from "@/components/providers/privacy";
import { SaveThemeToAccount } from "@/components/providers/theme";
import { UnreadProvider } from "@/components/providers/unread";
import { SiteHeader } from "@/components/site-header";
import { TourProvider } from "@/components/tour/tour-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PRIVACY_COOKIE } from "@/lib/constants";
import { getBalance, getCategories, getUnreadCount, requireActiveProfile } from "@/lib/data";
import { getAppConfig } from "@/lib/env";
import { displayName } from "@/lib/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireActiveProfile();
  const [categories, unreadCount, balance, cookieStore] = await Promise.all([
    getCategories(),
    getUnreadCount(),
    getBalance(null),
    cookies(),
  ]);
  const config = getAppConfig(profile.currency);

  const user: ShellUser = {
    name: displayName(profile),
    email: profile.email,
    avatarUrl: profile.avatar_url,
    isSuperadmin: profile.role === "superadmin",
    currency: config.currency,
  };

  return (
    <SaveThemeToAccount>
      <AppConfigProvider value={{ ...config, editWindowMinutes: profile.edit_window_minutes }}>
        <PrivacyProvider initialHidden={cookieStore.get(PRIVACY_COOKIE)?.value === "on"}>
          <UnreadProvider initialCount={unreadCount}>
            <EntrySheetsProvider categories={categories} available={balance.available}>
              <TourProvider autoStart={!profile.onboarded_at}>
                <SidebarProvider
                  style={
                    {
                      "--sidebar-width": "calc(var(--spacing) * 64)",
                      "--header-height": "calc(var(--spacing) * 14)",
                    } as React.CSSProperties
                  }
                >
                  <AppSidebar variant="inset" user={user} />
                  <SidebarInset className="min-w-0 bg-app-glow">
                    <SiteHeader user={user} />
                    <div className="@container/main mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] md:px-6 md:pt-6 md:pb-10">
                      {children}
                    </div>
                  </SidebarInset>
                  <MobileNav user={user} />
                </SidebarProvider>
              </TourProvider>
            </EntrySheetsProvider>
          </UnreadProvider>
        </PrivacyProvider>
      </AppConfigProvider>
    </SaveThemeToAccount>
  );
}
