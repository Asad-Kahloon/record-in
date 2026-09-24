"use client";

import { CalendarClockIcon, ChartPieIcon, GaugeIcon, ReceiptIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { categoryIcon } from "@/lib/categories";
import { daysInMonth } from "@/lib/dates";
import { formatPercent, percentChange } from "@/lib/format";
import type { MonthSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Tile {
  icon: typeof GaugeIcon;
  label: string;
  value: string;
  hint: string;
  valueIsMoney?: boolean;
  hintIsMoney?: boolean;
  tone?: string;
}

export function InsightsGrid({
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
  const { locale } = useAppConfig();

  const days = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
  const average = days ? summary.expense_total / days : 0;
  const todayEntry = summary.daily.find((d) => d.date === today);
  const change = percentChange(summary.expense_total, summary.prev_expense_total);
  const top = summary.categories[0];

  const tiles: Tile[] = [
    isCurrentMonth
      ? {
          icon: CalendarClockIcon,
          label: "Spent today",
          value: money(todayEntry?.total ?? 0),
          valueIsMoney: true,
          hint: todayEntry ? `${todayEntry.count} expense${todayEntry.count === 1 ? "" : "s"}` : "Nothing yet today",
        }
      : {
          icon: ReceiptIcon,
          label: "Biggest expense",
          value: money(summary.largest_expense?.amount ?? 0),
          valueIsMoney: true,
          hint: summary.largest_expense?.description ?? "No expenses",
        },
    {
      icon: GaugeIcon,
      label: "Daily average",
      value: money(average),
      valueIsMoney: true,
      hint: isCurrentMonth ? `On pace for ${money(average * daysInMonth(month), { compact: true })}` : `Over ${days} days`,
      hintIsMoney: isCurrentMonth,
    },
    {
      icon: change !== null && change < 0 ? TrendingDownIcon : TrendingUpIcon,
      label: "vs last month",
      value: change === null ? "—" : `${change > 0 ? "+" : "−"}${formatPercent(Math.abs(change), locale)}`,
      hint: change === null ? "Nothing to compare yet" : change > 0 ? "More spending" : "Less spending",
      tone: change === null ? undefined : change > 0 ? "text-destructive" : "text-positive",
    },
    {
      icon: top ? categoryIcon(top.category) : ChartPieIcon,
      label: "Top category",
      value: top?.name ?? "—",
      hint: top ? money(top.total) : "No spending yet",
      hintIsMoney: Boolean(top),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
              <tile.icon className="size-4 text-foreground/80" />
            </span>
            {tile.label}
          </p>
          <p className={cn("mt-2 truncate text-base font-semibold", tile.valueIsMoney && "money", tile.tone)}>{tile.value}</p>
          <p className={cn("truncate text-xs text-muted-foreground", tile.hintIsMoney && "money")}>{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}
