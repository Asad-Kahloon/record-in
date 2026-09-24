"use client";

import { ArrowRightIcon, BellRingIcon } from "lucide-react";
import Link from "next/link";

import { NotificationRow } from "@/components/notification-list";
import { useMoney } from "@/components/providers/app-config";
import { useUnread } from "@/components/providers/unread";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemGroup } from "@/components/ui/item";
import { describeNotification } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/types";

/** Top-of-dashboard heads-up for the super admin when there's unseen activity. */
export function ActivityBanner({ items }: { items: NotificationItem[] }) {
  const { count } = useUnread();
  const money = useMoney();
  const latest = items.find((item) => !item.read_at);
  if (!count || !latest) return null;

  const text = describeNotification(latest, money);

  return (
    <Alert className="border-brand/30 bg-brand/8 pr-24">
      <BellRingIcon className="text-brand!" />
      <AlertTitle>
        {count} new update{count === 1 ? "" : "s"} since your last visit
      </AlertTitle>
      <AlertDescription className="line-clamp-1">
        Latest: {text.title}
        {text.detail ? ` — ${text.detail}` : ""}
      </AlertDescription>
      <AlertAction>
        <Button asChild size="sm" variant="secondary">
          <Link href="/notifications">View</Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}

export function ActivityCard({ items, className }: { items: NotificationItem[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Account activity</CardTitle>
        <CardDescription>What everyone has been adding</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/notifications">
              All
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-1.5">
        <ItemGroup className="gap-1">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
