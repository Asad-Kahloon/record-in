"use client";

import {
  BellIcon,
  CircleQuestionMarkIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { signOutAction } from "@/app/actions/auth";
import type { ShellUser } from "@/components/nav-items";
import { usePrivacy } from "@/components/providers/privacy";
import { LOGIN_TOAST_KEY } from "@/components/providers/unread";
import { useTour } from "@/components/tour/tour-provider";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function useSignOut() {
  const [pending, startTransition] = useTransition();
  const signOut = () =>
    startTransition(async () => {
      try {
        window.sessionStorage.removeItem(LOGIN_TOAST_KEY);
      } catch {
        // ignore
      }
      await signOutAction();
    });
  return { pending, signOut };
}

export function NavUser({ user }: { user: ShellUser }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { pending, signOut } = useSignOut();
  const { start } = useTour();
  const { hidden, toggle } = usePrivacy();
  const closeMobile = () => isMobile && setOpenMobile(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar name={user.name} src={user.avatarUrl} className="rounded-lg" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar name={user.name} src={user.avatarUrl} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={closeMobile}>
                  <UserRoundIcon />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/notifications" onClick={closeMobile}>
                  <BellIcon />
                  Notifications
                </Link>
              </DropdownMenuItem>
              {user.isSuperadmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin" onClick={closeMobile}>
                    <ShieldCheckIcon />
                    All accounts
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => {
                  closeMobile();
                  start();
                }}
              >
                <CircleQuestionMarkIcon />
                Take the tour
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  toggle();
                }}
              >
                {hidden ? <EyeIcon /> : <EyeOffIcon />}
                {hidden ? "Show amounts" : "Hide amounts"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={pending} onSelect={signOut}>
              <LogOutIcon />
              {pending ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
