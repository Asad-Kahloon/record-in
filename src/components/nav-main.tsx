"use client";

import { CirclePlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ADMIN_NAV,
  isActivePath,
  NAV_GROUPS,
  NOTIFICATIONS_NAV,
  PROFILE_NAV,
  type NavItem,
} from "@/components/nav-items";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { useUnread } from "@/components/providers/unread";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActivePath(pathname, item.href)} tooltip={item.title}>
        <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {badge ? (
        <SidebarMenuBadge className="bg-brand text-brand-foreground">{badge > 99 ? "99+" : badge}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

function Group({ label, items, badges }: { label: string; items: NavItem[]; badges?: Record<string, number> }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavLink key={item.href} item={item} badge={badges?.[item.href]} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function NavMain({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { openQuickAdd } = useEntrySheets();
  const { count } = useUnread();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Add transaction"
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                  openQuickAdd();
                }}
                className="min-w-8 bg-primary font-semibold text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              >
                <CirclePlusIcon />
                <span>Add transaction</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {NAV_GROUPS.map((group) => (
        <Group key={group.label} label={group.label} items={group.items} />
      ))}

      <Group
        label="Account"
        items={isSuperadmin ? [NOTIFICATIONS_NAV, PROFILE_NAV, ADMIN_NAV] : [NOTIFICATIONS_NAV, PROFILE_NAV]}
        badges={{ [NOTIFICATIONS_NAV.href]: count }}
      />
    </>
  );
}
