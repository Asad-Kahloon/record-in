import { CalendarCheckIcon, CrownIcon, FlameIcon, ReceiptTextIcon, ScaleIcon, TrendingUpIcon } from "lucide-react";

import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { MiniStat } from "@/components/mini-stat";
import { HighlightsCard, PaymentMethodsCard, type Highlight } from "@/components/reports/report-cards";
import { daysInMonth, formatDate, formatMonth, shiftMonth } from "@/lib/dates";
import type { AppConfig } from "@/lib/env";
import { formatMoney, formatPercent, percentChange } from "@/lib/format";
import type { MonthSummary } from "@/lib/types";

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: undefined };

export function MonthReport({
  summary,
  month,
  today,
  isCurrentMonth,
  config,
}: {
  summary: MonthSummary;
  month: string;
  today: string;
  isCurrentMonth: boolean;
  config: AppConfig;
}) {
  const money = (n: number) => formatMoney(n, config);
  const saved = summary.income_total - summary.expense_total;
  const rate = summary.income_total > 0 ? saved / summary.income_total : null;
  const change = percentChange(summary.expense_total, summary.prev_expense_total);
  const days = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
  const busiest = summary.daily.reduce<(typeof summary.daily)[number] | null>(
    (max, d) => (!max || d.total > max.total ? d : max),
    null,
  );
  const top = summary.categories[0];
  const prevLabel = formatMonth(shiftMonth(month, -1), config.locale, "short");

  const highlights: Highlight[] = [
    {
      icon: CrownIcon,
      label: "Largest expense",
      value: summary.largest_expense ? money(summary.largest_expense.amount) : "—",
      hint: summary.largest_expense
        ? `${summary.largest_expense.description} · ${formatDate(summary.largest_expense.spent_on, config.locale, SHORT_DATE)}`
        : undefined,
    },
    {
      icon: FlameIcon,
      label: "Busiest day",
      value: busiest ? money(busiest.total) : "—",
      hint: busiest ? `${formatDate(busiest.date, config.locale, SHORT_DATE)} · ${busiest.count} expenses` : undefined,
    },
    {
      icon: TrendingUpIcon,
      label: "Top category",
      value: top ? top.name : "—",
      hint: top
        ? `${money(top.total)} · ${formatPercent(summary.expense_total ? top.total / summary.expense_total : 0, config.locale)} of spending`
        : undefined,
    },
    {
      icon: ReceiptTextIcon,
      label: "Average expense",
      value: summary.expense_count ? money(summary.expense_total / summary.expense_count) : "—",
      hint: `${summary.expense_count} expenses in total`,
    },
    {
      icon: CalendarCheckIcon,
      label: "Days with spending",
      value: `${summary.active_days} of ${days}`,
      hint: `${money(days ? summary.expense_total / days : 0)} per day on average`,
    },
    {
      icon: ScaleIcon,
      label: `Compared with ${prevLabel}`,
      value: change === null ? "No data" : `${change > 0 ? "+" : "−"}${formatPercent(Math.abs(change), config.locale)}`,
      hint: change === null ? "Nothing to compare yet" : `${money(summary.prev_expense_total)} spent last month`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-3">
        <MiniStat
          label="Carried in"
          value={money(summary.opening_balance)}
          hint="Left over from earlier months"
        />
        <MiniStat label="Income" value={money(summary.income_total)} tone="income" hint={`${summary.income_count} entries`} />
        <MiniStat label="Spent" value={money(summary.expense_total)} tone="expense" hint={`${summary.expense_count} expenses`} />
        <MiniStat
          label={saved >= 0 ? "Saved" : "Overspent"}
          value={money(Math.abs(saved))}
          tone="brand"
          hint={rate !== null ? `${formatPercent(rate, config.locale)} savings rate` : "Add income to see savings"}
        />
        <MiniStat
          label="Left at month end"
          value={money(summary.closing_balance)}
          tone="brand"
          hint={`Carried into ${formatMonth(shiftMonth(month, 1), config.locale, "short")}`}
        />
        <MiniStat
          label="Daily average"
          value={money(days ? summary.expense_total / days : 0)}
          hint={isCurrentMonth ? `Projected ${formatMoney((summary.expense_total / Math.max(days, 1)) * daysInMonth(month), config, { compact: true })}` : `${days} days`}
        />
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-5">
        <DailySpendChart month={month} daily={summary.daily} className="@4xl/main:col-span-3" />
        <CategoryBreakdown
          categories={summary.categories}
          total={summary.expense_total}
          limit={8}
          className="@4xl/main:col-span-2"
        />
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-5">
        <HighlightsCard items={highlights} className="@4xl/main:col-span-3" />
        <PaymentMethodsCard
          methods={summary.payment_methods}
          total={summary.expense_total}
          config={config}
          className="@4xl/main:col-span-2"
        />
      </div>
    </div>
  );
}
