"use client";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { daysInMonth } from "@/lib/dates";
import { formatPercent, percentChange } from "@/lib/format";
import type { MonthSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function Delta({ value, upIsGood }: { value: number; upIsGood: boolean }) {
  const { locale } = useAppConfig();
  const up = value > 0;
  const good = value === 0 ? null : up === upIsGood;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Badge
      variant="outline"
      className={cn(good === true && "text-positive", good === false && "text-destructive")}
    >
      <Icon />
      {up ? "+" : "−"}
      {formatPercent(Math.abs(value), locale)}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  delta,
  upIsGood = true,
  footer,
}: {
  label: string;
  value: string;
  delta?: number | null;
  upIsGood?: boolean;
  footer: React.ReactNode;
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="money truncate text-xl font-semibold tracking-tight @[15rem]/card:text-2xl">{value}</CardTitle>
        {delta !== null && delta !== undefined ? (
          <CardAction className="hidden @[14rem]/card:block">
            <Delta value={delta} upIsGood={upIsGood} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardFooter className="mt-auto flex-col items-start gap-1 text-xs text-muted-foreground">
        {delta !== null && delta !== undefined ? (
          <span className="@[14rem]/card:hidden">
            <Delta value={delta} upIsGood={upIsGood} />
          </span>
        ) : null}
        <span className="line-clamp-1">{footer}</span>
      </CardFooter>
    </Card>
  );
}

export function SectionCards({
  summary,
  month,
  today,
  isCurrentMonth,
}: {
  summary: MonthSummary;
  month: string;
  today: string;
  isCurrentMonth: boolean;
}) {
  const money = useMoney();

  const daysElapsed = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
  const dailyAverage = daysElapsed ? summary.expense_total / daysElapsed : 0;
  const projected = dailyAverage * daysInMonth(month);
  const todayEntry = summary.daily.find((d) => d.date === today);
  const comparable = summary.prev_expense_total > 0 || summary.prev_income_total > 0;

  return (
    <div className="grid grid-cols-2 gap-3 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/4 *:data-[slot=card]:to-card md:gap-4 @4xl/main:grid-cols-4">
      <StatCard
        label="Income"
        value={money(summary.income_total)}
        delta={comparable ? percentChange(summary.income_total, summary.prev_income_total) : null}
        footer={
          summary.income_count
            ? `${summary.income_count} ${summary.income_count === 1 ? "entry" : "entries"} · vs last month`
            : "Nothing recorded yet"
        }
      />
      <StatCard
        label="Spent"
        value={money(summary.expense_total)}
        delta={comparable ? percentChange(summary.expense_total, summary.prev_expense_total) : null}
        upIsGood={false}
        footer={`${summary.expense_count} expenses · ${summary.active_days} days`}
      />
      <StatCard
        label="Daily average"
        value={money(dailyAverage)}
        footer={
          isCurrentMonth
            ? `On pace for ${money(projected, { compact: true })}`
            : `Across ${daysElapsed} days`
        }
      />
      {isCurrentMonth ? (
        <StatCard
          label="Spent today"
          value={money(todayEntry?.total ?? 0)}
          footer={todayEntry ? `${todayEntry.count} expense${todayEntry.count === 1 ? "" : "s"} today` : "Nothing yet today"}
        />
      ) : (
        <StatCard
          label="Biggest expense"
          value={money(summary.largest_expense?.amount ?? 0)}
          footer={summary.largest_expense?.description ?? "No expenses"}
        />
      )}
    </div>
  );
}
