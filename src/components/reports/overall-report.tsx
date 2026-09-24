import { CalendarRangeIcon, ChartColumnIcon, CrownIcon, PiggyBankIcon, ReceiptTextIcon, TrendingUpIcon } from "lucide-react";

import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { MiniStat } from "@/components/mini-stat";
import { HighlightsCard, PaymentMethodsCard, type Highlight } from "@/components/reports/report-cards";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatDate, formatMonth } from "@/lib/dates";
import type { AppConfig } from "@/lib/env";
import { formatMoney, formatPercent } from "@/lib/format";
import type { OverallSummary } from "@/lib/types";

export function OverallReport({ overall, config }: { overall: OverallSummary; config: AppConfig }) {
  const money = (n: number) => formatMoney(n, config);

  if (overall.months.length === 0) {
    return (
      <Empty className="border bg-card/50 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl">
            <ChartColumnIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-base">Nothing to report yet</EmptyTitle>
          <EmptyDescription>Once you add income and expenses, your all-time report builds itself here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const saved = overall.income_total - overall.expense_total;
  const rate = overall.income_total > 0 ? saved / overall.income_total : null;
  const monthsTracked = overall.months.length;
  const withIncome = overall.months.filter((m) => m.income > 0);
  const bestSaving = withIncome.reduce<(typeof withIncome)[number] | null>(
    (best, m) => (!best || m.income - m.expense > best.income - best.expense ? m : best),
    null,
  );
  const topSpending = overall.months.reduce<(typeof overall.months)[number] | null>(
    (top, m) => (!top || m.expense > top.expense ? m : top),
    null,
  );
  const firstMonth = overall.months[0]?.month;

  const highlights: Highlight[] = [
    {
      icon: CalendarRangeIcon,
      label: "Tracking since",
      value: firstMonth ? formatMonth(firstMonth, config.locale) : "—",
      hint: `${monthsTracked} month${monthsTracked === 1 ? "" : "s"} of records`,
    },
    {
      icon: PiggyBankIcon,
      label: "Best month for saving",
      value: bestSaving ? formatMonth(bestSaving.month, config.locale) : "—",
      hint: bestSaving ? `${money(bestSaving.income - bestSaving.expense)} saved` : "Add income to compare",
    },
    {
      icon: TrendingUpIcon,
      label: "Highest spending month",
      value: topSpending ? formatMonth(topSpending.month, config.locale) : "—",
      hint: topSpending ? `${money(topSpending.expense)} spent` : undefined,
    },
    {
      icon: CrownIcon,
      label: "Largest expense ever",
      value: overall.largest_expense ? money(overall.largest_expense.amount) : "—",
      hint: overall.largest_expense
        ? `${overall.largest_expense.description} · ${formatDate(overall.largest_expense.spent_on, config.locale)}`
        : undefined,
    },
    {
      icon: ReceiptTextIcon,
      label: "Average expense",
      value: overall.expense_count ? money(overall.expense_total / overall.expense_count) : "—",
      hint: `${overall.expense_count} expenses logged`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-4">
        <MiniStat label="Total income" value={money(overall.income_total)} tone="income" />
        <MiniStat label="Total spent" value={money(overall.expense_total)} tone="expense" />
        <MiniStat
          label={saved >= 0 ? "Total saved" : "Total overspent"}
          value={money(Math.abs(saved))}
          tone="brand"
          hint={rate !== null ? `${formatPercent(rate, config.locale)} savings rate` : undefined}
        />
        <MiniStat
          label="Avg. monthly spend"
          value={money(overall.expense_total / monthsTracked)}
          hint={`Over ${monthsTracked} month${monthsTracked === 1 ? "" : "s"}`}
        />
      </div>

      <IncomeExpenseChart months={overall.months} />

      <div className="grid gap-4 @4xl/main:grid-cols-5">
        <CategoryBreakdown
          title="All-time categories"
          categories={overall.categories}
          total={overall.expense_total}
          limit={8}
          className="@4xl/main:col-span-2"
        />
        <HighlightsCard items={highlights} className="@4xl/main:col-span-3" />
      </div>

      <PaymentMethodsCard methods={overall.payment_methods} total={overall.expense_total} config={config} />
    </div>
  );
}
