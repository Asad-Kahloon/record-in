"use client";

import { ChevronRightIcon, CircleQuestionMarkIcon, EyeIcon, EyeOffIcon, LogOutIcon, MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";

import {
  ADMIN_NAV,
  BUDGETS_NAV,
  DEBTS_NAV,
  EXPENSES_NAV,
  GOALS_NAV,
  INCOME_NAV,
  NOTIFICATIONS_NAV,
  PROFILE_NAV,
  RATES_NAV,
  type ShellUser,
} from "@/components/nav-items";
import { useSignOut } from "@/components/nav-user";
import { usePrivacy } from "@/components/providers/privacy";
import { useThemeControl } from "@/components/providers/theme";
import { useUnread } from "@/components/providers/unread";
import { useTour } from "@/components/tour/tour-provider";
import { InstallButton } from "@/components/pwa/install-card";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

/** Phone "More" menu: every other section plus tour, privacy and sign-out. */
export function MoreSheet({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ShellUser;
}) {
  const { start } = useTour();
  const { hidden, toggle } = usePrivacy();
  const { theme, toggle: toggleTheme } = useThemeControl();
  const { pending, signOut } = useSignOut();
  const { count } = useUnread();
  const close = () => onOpenChange(false);

  const items = [EXPENSES_NAV, INCOME_NAV, DEBTS_NAV, BUDGETS_NAV, GOALS_NAV, RATES_NAV, NOTIFICATIONS_NAV, PROFILE_NAV];
  if (user.isSuperadmin) items.push(ADMIN_NAV);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90svh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>More</DrawerTitle>
          <DrawerDescription>All sections and settings</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Link
            href="/profile"
            onClick={close}
            className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 ring-1 ring-foreground/5 active:bg-muted"
          >
            <UserAvatar name={user.name} src={user.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary">{user.currency}</Badge>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </Link>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="relative flex flex-col items-center gap-2 rounded-2xl bg-card px-2 py-3 text-center ring-1 ring-foreground/10 active:bg-muted"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
                  <item.icon className="size-5" />
                </span>
                <span className="text-xs leading-tight font-semibold">{item.short ?? item.title}</span>
                {item.href === NOTIFICATIONS_NAV.href && count > 0 ? (
                  <span className="absolute top-2 right-2 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-4 font-semibold text-brand-foreground">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>

          <InstallButton className="mt-4" onDone={close} />

          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-11 justify-start rounded-xl"
              onClick={() => {
                close();
                start();
              }}
            >
              <CircleQuestionMarkIcon />
              Take the tour
            </Button>
            <Button variant="outline" className="h-11 justify-start rounded-xl" onClick={toggle}>
              {hidden ? <EyeIcon /> : <EyeOffIcon />}
              {hidden ? "Show amounts" : "Hide amounts"}
            </Button>
            <Button variant="outline" className="h-11 justify-start rounded-xl" onClick={toggleTheme}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
            <Button variant="destructive" className="h-11 justify-start rounded-xl" onClick={signOut} disabled={pending}>
              <LogOutIcon />
              {pending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
