"use client";

import { useEffect, useMemo } from "react";

import { markNotificationsReadAction } from "@/app/actions/account";
import { NotificationRow } from "@/components/notification-list";
import { useAppConfig } from "@/components/providers/app-config";
import { useUnread } from "@/components/providers/unread";
import { ItemGroup } from "@/components/ui/item";
import { formatDayHeading, todayIn } from "@/lib/dates";
import type { NotificationItem } from "@/lib/types";

export function NotificationFeed({ items }: { items: NotificationItem[] }) {
  const { timeZone, locale } = useAppConfig();
  const { setCount } = useUnread();

  // Opening the feed counts as reading it. Keep the "new" highlights visible
  // for this visit and just clear the badge.
  useEffect(() => {
    if (!items.some((item) => !item.read_at)) return;
    void markNotificationsReadAction(undefined, { silent: true }).then((result) => {
      if (result.ok) setCount(0);
    });
  }, [items, setCount]);

  const groups = useMemo(() => {
    const today = todayIn(timeZone);
    const out: { label: string; items: NotificationItem[] }[] = [];
    for (const item of items) {
      const label = formatDayHeading(todayIn(timeZone, new Date(item.created_at)), today, locale);
      const last = out.at(-1);
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [items, timeZone, locale]);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">{group.label}</h2>
          <ItemGroup className="gap-1 rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10">
            {group.items.map((item) => (
              <NotificationRow key={item.id} item={item} />
            ))}
          </ItemGroup>
        </section>
      ))}
    </div>
  );
}
