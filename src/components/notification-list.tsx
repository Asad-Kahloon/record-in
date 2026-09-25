"use client";

import { HandCoinsIcon, PiggyBankIcon, ReceiptTextIcon, UserPlusIcon, WalletIcon } from "lucide-react";

import { useMoney } from "@/components/providers/app-config";
import { UserAvatar } from "@/components/user-avatar";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { timeAgo } from "@/lib/dates";
import { describeNotification, type NotificationTone } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<NotificationTone, { icon: typeof WalletIcon; className: string }> = {
  expense: { icon: ReceiptTextIcon, className: "bg-expense text-white" },
  income: { icon: WalletIcon, className: "bg-income text-white" },
  debt: { icon: HandCoinsIcon, className: "bg-brand text-brand-foreground" },
  goal: { icon: PiggyBankIcon, className: "bg-brand/80 text-brand-foreground" },
  user: { icon: UserPlusIcon, className: "bg-secondary text-foreground" },
};

export function NotificationRow({ item, className }: { item: NotificationItem; className?: string }) {
  const money = useMoney();
  const text = describeNotification(item, money);
  const tone = TONE[text.tone];
  const unread = !item.read_at;

  return (
    <Item size="sm" className={cn("items-start rounded-xl", unread && "bg-brand/6", className)}>
      <ItemMedia className="relative">
        <UserAvatar name={item.actor_name} src={item.actor_avatar_url} />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full ring-2 ring-popover",
            tone.className,
          )}
        >
          <tone.icon className="size-2.5" />
        </span>
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="line-clamp-2 w-full">{text.title}</ItemTitle>
        {text.detail ? <ItemDescription className="money line-clamp-1 text-xs">{text.detail}</ItemDescription> : null}
        <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
          {timeAgo(item.created_at)}
        </span>
      </ItemContent>
      {unread ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : null}
    </Item>
  );
}
