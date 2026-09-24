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
  over: { label: "Over income", icon: CircleAlertIcon, text: "text-destructive", fill: "bg-critical", track: "bg-critical/20" },
} as const;

/** The one hero number on the dashboard, plus a meter of income spent. */
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

  const income = summary.income_total;
  const spent = summary.expense_total;
  const balance = income - spent;
  const share = income > 0 ? spent / income : null;
  const statusKey = share === null ? null : share > 1 ? "over" : share >= 0.8 ? "warning" : "ok";
  const status = statusKey ? STATUS[statusKey] : null;
  const period = isCurrentMonth ? "this month" : `in ${formatMonth(month, locale)}`;

  const heading = income > 0 ? (balance >= 0 ? `Left to spend ${period}` : `Spent over income ${period}`) : `Spent ${period}`;

  return (
    <Card className="relative overflow-hidden bg-linear-to-br from-brand/16 via-card to-card ring-brand/20">
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-brand/20 blur-3xl" />
      <CardContent className="relative flex flex-col gap-6 py-2 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">{heading}</p>
          <p className="money text-5xl font-semibold tracking-tight break-all md:text-6xl">
            {money(income > 0 ? Math.abs(balance) : spent)}
          </p>
          {status ? (
            <p className={cn("flex items-center gap-1.5 text-sm font-medium", status.text)}>
              <status.icon className="size-4" />
              {status.label}
              <span className="font-normal text-muted-foreground">
                · {formatPercent(share ?? 0, locale)} of income spent
              </span>
            </p>
          ) : !readOnly ? (
            <Button size="sm" variant="secondary" onClick={() => addIncome(month)} className="rounded-full">
              <PlusIcon />
              Add {formatMonth(month, locale, "long").split(" ")[0]} income
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No income recorded for this month.</p>
          )}
        </div>

        <div className="w-full space-y-3 md:max-w-sm">
          {status ? (
            <div
              role="meter"
              aria-label="Share of income spent"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((share ?? 0) * 100)}
              className={cn("h-2.5 overflow-hidden rounded-full", status.track)}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", status.fill)}
                style={{ width: `${Math.min(100, Math.max(2, (share ?? 0) * 100))}%` }}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/40 p-3 ring-1 ring-foreground/5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-income" />
                Income
              </p>
              <p className="money mt-1 truncate text-lg font-semibold">{money(income)}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3 ring-1 ring-foreground/5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-expense" />
                Spent
              </p>
              <p className="money mt-1 truncate text-lg font-semibold">{money(spent)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
