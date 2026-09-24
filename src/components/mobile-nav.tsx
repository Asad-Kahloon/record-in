"use client";

import { LayoutGridIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { MoreSheet } from "@/components/more-sheet";
import {
  ADMIN_NAV,
  BUDGETS_NAV,
  DEBTS_NAV,
  EXPENSES_NAV,
  HOME_NAV,
  INCOME_NAV,
  isActivePath,
  NOTIFICATIONS_NAV,
  PROFILE_NAV,
  REPORTS_NAV,
  TRANSACTIONS_NAV,
  type NavItem,
  type ShellUser,
} from "@/components/nav-items";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { useUnread } from "@/components/providers/unread";
import { cn } from "@/lib/utils";

const MORE_ROUTES = [EXPENSES_NAV, INCOME_NAV, DEBTS_NAV, BUDGETS_NAV, NOTIFICATIONS_NAV, PROFILE_NAV, ADMIN_NAV];

function TabShell({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <>
      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-brand/15")}>
        {children}
      </span>
    </>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors",
    active ? "text-foreground" : "text-muted-foreground active:text-foreground",
  );

function Tab({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
      <TabShell active={active}>
        <item.icon className={cn("size-5", active && "text-brand")} />
      </TabShell>
      {item.short ?? item.title}
    </Link>
  );
}

/** Banking-style bottom bar: Home · Activity · + · Reports · More. Hidden from md up. */
export function MobileNav({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const { openQuickAdd } = useEntrySheets();
  const { count } = useUnread();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ROUTES.some((item) => isActivePath(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Primary"
        data-tour="nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/6 bg-background/85 pb-safe backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          <Tab item={HOME_NAV} />
          <Tab item={TRANSACTIONS_NAV} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openQuickAdd}
              aria-label="Add a transaction"
              data-tour="add"
              className="-mt-8 flex size-15 items-center justify-center rounded-full bg-linear-to-br from-brand to-[#5a4bd1] text-brand-foreground shadow-[0_10px_30px_-8px_var(--brand)] ring-[5px] ring-background transition-transform active:scale-95"
            >
              <PlusIcon className="size-7" strokeWidth={2.5} />
            </button>
          </div>
          <Tab item={REPORTS_NAV} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={tabClass(moreActive)}
          >
            <TabShell active={moreActive}>
              <LayoutGridIcon className={cn("size-5", moreActive && "text-brand")} />
            </TabShell>
            More
            {count > 0 ? <span className="absolute top-1 right-3 size-2 rounded-full bg-brand" aria-label="New notifications" /> : null}
          </button>
        </div>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} user={user} />
    </>
  );
}
