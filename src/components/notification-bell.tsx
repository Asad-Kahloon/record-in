"use client";

import { BellIcon, CheckCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { getLatestNotificationsAction, markNotificationsReadAction } from "@/app/actions/account";
import { NotificationRow } from "@/components/notification-list";
import { useUnread } from "@/components/providers/unread";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationItem } from "@/lib/types";

export function NotificationBell() {
  const { count, setCount } = useUnread();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () =>
    startTransition(async () => {
      setItems(await getLatestNotificationsAction());
    });

  const markAll = () =>
    startTransition(async () => {
      const result = await markNotificationsReadAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCount(0);
      setItems((current) => current?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
    });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-tour="notifications" aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
          <BellIcon />
          {count > 0 ? (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-4 font-semibold text-brand-foreground ring-2 ring-background">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-medium">Notifications</p>
          <Button variant="ghost" size="xs" onClick={markAll} disabled={pending || count === 0}>
            <CheckCheckIcon />
            Mark all read
          </Button>
        </div>
        <div className="max-h-[60svh] overflow-y-auto p-1.5">
          {items === null ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BellIcon />
                </EmptyMedia>
                <EmptyTitle>All caught up</EmptyTitle>
                <EmptyDescription>New activity from your accounts shows up here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/notifications">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
