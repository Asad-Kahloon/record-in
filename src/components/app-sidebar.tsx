"use client";

import Link from "next/link";
import * as React from "react";

import { BrandMark } from "@/components/brand";
import { NavMain } from "@/components/nav-main";
import type { ShellUser } from "@/components/nav-items";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: ShellUser }) {
  return (
    <Sidebar collapsible="icon" data-tour="nav" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="hover:bg-transparent active:bg-transparent">
              <Link href="/dashboard">
                <BrandMark />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-base font-semibold tracking-tight">{APP_NAME}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.isSuperadmin ? "Super admin" : "Personal finance"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain isSuperadmin={user.isSuperadmin} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
