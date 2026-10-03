"use client";

import { CircleQuestionMarkIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { pageTitle, type ShellUser } from "@/components/nav-items";
import { NotificationBell } from "@/components/notification-bell";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { PrivacyToggle } from "@/components/providers/privacy";
import { ThemeToggle } from "@/components/providers/theme";
import { useTour } from "@/components/tour/tour-provider";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const { openQuickAdd } = useEntrySheets();
  const { start } = useTour();

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b bg-background/75 pt-safe backdrop-blur-xl md:rounded-t-xl">
      <div className="flex h-(--header-height) w-full items-center gap-1 px-3 md:px-6 lg:gap-2">
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
        <Separator orientation="vertical" className="mx-1.5 hidden data-[orientation=vertical]:h-4 md:block" />
        <Link href="/profile" className="mr-2 rounded-full md:hidden" aria-label="Your profile">
          <UserAvatar name={user.name} src={user.avatarUrl} />
        </Link>
        <h1 className="truncate text-base font-semibold tracking-tight">{pageTitle(pathname)}</h1>

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          <Button variant="ghost" size="icon" onClick={start} aria-label="Take the tour" data-tour="tour">
            <CircleQuestionMarkIcon />
          </Button>
          <PrivacyToggle />
          <ThemeToggle />
          <NotificationBell />
          <Button onClick={openQuickAdd} className="ml-1.5 hidden rounded-full px-4 md:inline-flex" data-tour="add">
            <PlusIcon />
            Add
          </Button>
        </div>
      </div>
    </header>
  );
}
