import type { Metadata } from "next";

import { AddIncomeButton } from "@/components/entry-buttons";
import { IncomeList } from "@/components/incomes/income-list";
import { MiniStat } from "@/components/mini-stat";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { getIncomes, getMonthSummary, requireActiveProfile } from "@/lib/data";
import { formatMonth, monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { formatMoney, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Income" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function IncomePage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const month = resolveMonth((await searchParams).month, config);
  const bounds = monthBounds(config);

  const [incomes, summary] = await Promise.all([getIncomes(month, null), getMonthSummary(month, null)]);
  const saved = summary.income_total - summary.expense_total;
  const rate = summary.income_total > 0 ? saved / summary.income_total : null;

  return (
    <>
      <PageHeader
        title="Income"
        description={`Money that came in for ${formatMonth(month, config.locale)}.`}
        actions={
          <>
            <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
            <AddIncomeButton month={month} className="hidden md:inline-flex" />
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Income" value={formatMoney(summary.income_total, config)} tone="income" />
        <MiniStat label="Spent" value={formatMoney(summary.expense_total, config)} tone="expense" />
        <MiniStat
          label={saved >= 0 ? "Saved" : "Overspent"}
          value={formatMoney(Math.abs(saved), config)}
          hint={rate !== null ? `${formatPercent(rate, config.locale)} of income` : undefined}
        />
      </div>

      <IncomeList incomes={incomes} month={month} />

      <AddIncomeButton month={month} className="h-11 w-full rounded-xl text-base md:hidden" />
    </>
  );
}
