"use client";

import { CircleAlertIcon, CircleCheckIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonth } from "@/lib/dates";
import { formatPercent } from "@/lib/format";
import type { MonthSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS = {
  ok: { label: "On track", icon: CircleCheckIcon, text: "text-positive", fill: "bg-brand", track: "bg-brand/15" },
  warning: { label: "Running low", icon: TriangleAlertIcon, text: "text-warning", fill: "bg-warning", track: "bg-warning/15" },
  over: { label: "Nothing left", icon: CircleAlertIcon, text: "text-destructive", fill: "bg-critical", track: "bg-critical/20" },
} as const;

/** Running balance for an account: what's left after every month so far. */
export function BalanceHero({
  summary,
  month,
  isCurrentMonth,
  readOnly = false,
}: {
  summary: MonthSummary;
  month: string;
  isCurrentMonth: boolean;
  readOnly?: boolean;
}) {
  const money = useMoney();
  const { locale } = useAppConfig();
  const { addIncome } = useEntrySheets();

  const carriedIn = summary.opening_balance;
  const income = summary.income_total;
  const spent = summary.expense_total;
  const balance = isCurrentMonth ? summary.available_balance : summary.closing_balance;
  const pot = carriedIn + income;
  const share = pot > 0 ? Math.min(spent / pot, 1) : null;
  const status = balance <= 0 ? STATUS.over : share !== null && share >= 0.8 ? STATUS.warning : STATUS.ok;

  return (
    <Card className="relative overflow-hidden bg-linear-to-br from-brand/16 via-card to-card ring-brand/20">
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-brand/20 blur-3xl" />
      <CardContent className="relative flex flex-col gap-6 py-2 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isCurrentMonth ? "Available balance" : `Left at the end of ${formatMonth(month, locale)}`}
          </p>
          <p className="money text-5xl font-semibold tracking-tight break-all md:text-6xl">{money(balance)}</p>
          <p className={cn("flex items-center gap-1.5 text-sm font-medium", status.text)}>
            <status.icon className="size-4" />
            {status.label}
            {share !== null ? (
              <span className="font-normal text-muted-foreground">
                · {formatPercent(share, locale)} of this month&apos;s money spent
              </span>
            ) : null}
          </p>
          {balance <= 0 && !readOnly ? (
            <Button size="sm" variant="secondary" onClick={() => addIncome(month)} className="rounded-full">
              <PlusIcon />
              Record income
            </Button>
          ) : null}
        </div>

        <div className="w-full space-y-3 md:max-w-sm">
          {share !== null ? (
            <div
              role="meter"
              aria-label="Share of this month's money spent"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              className={cn("h-2.5 overflow-hidden rounded-full", status.track)}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", status.fill)}
                style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-background/40 p-3 ring-1 ring-foreground/5">
              <p className="text-xs text-muted-foreground">Carried in</p>
              <p className="money mt-1 truncate font-semibold">{money(carriedIn)}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3 ring-1 ring-foreground/5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-income" />
                In
              </p>
              <p className="money mt-1 truncate font-semibold">{money(income)}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3 ring-1 ring-foreground/5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-expense" />
                Out
              </p>
              <p className="money mt-1 truncate font-semibold">{money(spent)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
