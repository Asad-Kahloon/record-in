"use client";

import { ArrowDownLeftIcon, ArrowDownToLineIcon, ArrowUpRightIcon } from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { UserAvatar } from "@/components/user-avatar";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { categoryIcon } from "@/lib/categories";
import { formatDayHeading, formatTime } from "@/lib/dates";
import type { Transaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export function transactionSubtitle(tx: Transaction): string {
  if (tx.kind === "expense") return tx.expense.category_name;
  if (tx.kind === "income") return "Income";
  if (tx.event === "settle") return "Borrow & lend · settled";
  return tx.debt.settled_on ? "Borrow & lend · settled" : "Borrow & lend · pending";
}

export function TransactionRow({
  tx,
  today,
  showDate = false,
  readOnly = false,
}: {
  tx: Transaction;
  today: string;
  showDate?: boolean;
  readOnly?: boolean;
}) {
  const money = useMoney();
  const { currency, locale, timeZone } = useAppConfig();
  const { openExpense, openIncome, openDebt } = useEntrySheets();
  const incoming = tx.flow === "in";

  let media: React.ReactNode;
  if (tx.kind === "expense") {
    const Icon = categoryIcon(tx.expense.category);
    media = (
      <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-5 text-foreground/80" />
      </span>
    );
  } else if (tx.kind === "income") {
    media = (
      <span className="flex size-11 items-center justify-center rounded-2xl bg-income/15 text-income">
        <ArrowDownToLineIcon className="size-5" />
      </span>
    );
  } else {
    media = (
      <span className="relative">
        <UserAvatar name={tx.debt.counterparty} size="lg" className="size-11" />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-white ring-2 ring-card",
            incoming ? "bg-income" : "bg-expense",
          )}
        >
          {incoming ? <ArrowDownLeftIcon className="size-3" /> : <ArrowUpRightIcon className="size-3" />}
        </span>
      </span>
    );
  }

  const when = showDate ? formatDayHeading(tx.date, today, locale) : formatTime(tx.created_at, locale, timeZone);

  const open = () => {
    if (tx.kind === "expense") openExpense(tx.expense);
    else if (tx.kind === "income") openIncome(tx.income);
    else openDebt(tx.debt);
  };

  const content = (
    <>
      <ItemMedia>{media}</ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="w-full truncate">{tx.title}</ItemTitle>
        <ItemDescription className="truncate text-xs">
          {transactionSubtitle(tx)} · {when}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-0.5">
        <span className={cn("money font-semibold tabular-nums", incoming && "text-income")}>
          {incoming ? "+" : "−"}
          {money(tx.base_amount)}
        </span>
        {tx.currency !== currency ? (
          <span className="money text-[11px] text-muted-foreground tabular-nums">{money(tx.amount, { currency: tx.currency })}</span>
        ) : tx.editable && !readOnly ? (
          <span className="text-[10px] font-semibold text-brand">Editable</span>
        ) : null}
      </ItemActions>
    </>
  );

  if (readOnly) return <Item className="flex-nowrap rounded-2xl px-2.5">{content}</Item>;

  return (
    <Item asChild className="flex-nowrap rounded-2xl px-2.5 text-left hover:bg-muted/60 active:bg-muted">
      <button type="button" onClick={open}>
        {content}
      </button>
    </Item>
  );
}
