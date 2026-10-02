"use client";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChartPieIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  HourglassIcon,
} from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { UserAvatar } from "@/components/user-avatar";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatDate, formatDayHeading } from "@/lib/dates";
import { isPartPaid, repaidPercent } from "@/lib/debts";
import type { Debt } from "@/lib/types";
import { cn } from "@/lib/utils";

const SHORT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: undefined };

export function DebtRow({
  debt,
  today,
  readOnly = false,
  onOpen,
}: {
  debt: Debt;
  today: string;
  readOnly?: boolean;
  onOpen?: (debt: Debt) => void;
}) {
  const money = useMoney();
  const { locale, currency } = useAppConfig();
  const borrowed = debt.direction === "borrowed";
  const settled = Boolean(debt.settled_on);
  const overdue = !settled && !!debt.due_on && debt.due_on < today;
  const partPaid = isPartPaid(debt);
  const progress = partPaid ? `${Math.floor(repaidPercent(debt))}% ${borrowed ? "paid back" : "received"}` : "";

  // Status always pairs an icon with a label, never color alone.
  const status = settled
    ? { label: borrowed ? "Paid back" : "Received", icon: CircleCheckIcon, className: "text-positive" }
    : overdue
      ? { label: partPaid ? `Overdue · ${progress}` : "Overdue", icon: CircleAlertIcon, className: "text-destructive" }
      : partPaid
        ? { label: progress, icon: ChartPieIcon, className: "text-brand" }
        : { label: "Pending", icon: HourglassIcon, className: "text-warning" };

  const when = settled && debt.settled_on
    ? formatDayHeading(debt.settled_on, today, locale)
    : debt.due_on
      ? `due ${formatDate(debt.due_on, locale, SHORT)}`
      : `since ${formatDate(debt.occurred_on, locale, SHORT)}`;

  const content = (
    <>
      <ItemMedia className="relative">
        <UserAvatar name={debt.counterparty} size="lg" />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-white ring-2 ring-card",
            borrowed ? "bg-income" : "bg-expense",
          )}
        >
          {borrowed ? <ArrowDownLeftIcon className="size-3" /> : <ArrowUpRightIcon className="size-3" />}
        </span>
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="w-full truncate">{debt.counterparty}</ItemTitle>
        <ItemDescription className="truncate text-xs">
          {borrowed ? "You borrowed" : "You lent"} · {when}
        </ItemDescription>
        <span className={cn("flex items-center gap-1 text-[11px] font-medium", status.className)}>
          <status.icon className="size-3" />
          {status.label}
        </span>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-0.5">
        {/* A part-paid debt leads with what is still owed. */}
        <span className={cn("money font-semibold tabular-nums", settled && "text-muted-foreground")}>
          {money(partPaid ? debt.open_base : debt.base_amount)}
        </span>
        {partPaid ? (
          <span className="money text-[11px] text-muted-foreground tabular-nums">
            {debt.currency !== currency
              ? `${money(debt.remaining, { currency: debt.currency })} left`
              : `left of ${money(debt.base_amount)}`}
          </span>
        ) : debt.currency !== currency ? (
          <span className="money text-[11px] text-muted-foreground tabular-nums">
            {money(debt.amount, { currency: debt.currency })}
          </span>
        ) : null}
      </ItemActions>
    </>
  );

  if (readOnly || !onOpen) return <Item className="flex-nowrap rounded-xl px-2.5">{content}</Item>;

  return (
    <Item asChild className="flex-nowrap rounded-xl px-2.5 text-left hover:bg-muted/60 active:bg-muted">
      <button type="button" onClick={() => onOpen(debt)}>
        {content}
      </button>
    </Item>
  );
}
