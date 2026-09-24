import type { Metadata } from "next";

import { DownloadButton } from "@/components/download-button";
import { AddExpenseButton } from "@/components/entry-buttons";
import { ExpenseList } from "@/components/expenses/expense-list";
import { MiniStat } from "@/components/mini-stat";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { getExpenses, requireActiveProfile } from "@/lib/data";
import { daysInMonth, formatMonth, monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Expenses" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const month = resolveMonth((await searchParams).month, config);
  const bounds = monthBounds(config);
  const expenses = await getExpenses(month, null);

  const total = expenses.reduce((sum, e) => sum + e.base_amount, 0);
  const days = month === bounds.current ? Number(bounds.today.slice(8, 10)) : daysInMonth(month);
  const lockedCount = expenses.filter((e) => !e.can_edit).length;

  return (
    <>
      <PageHeader
        title="Expenses"
        description={`Everything you spent in ${formatMonth(month, config.locale)}.`}
        actions={
          <>
            <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
            <AddExpenseButton className="hidden md:inline-flex" />
            <DownloadButton href={`/api/export?scope=me&month=${month}`} label="CSV" className="hidden md:inline-flex" />
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total spent" value={formatMoney(total, config)} tone="expense" />
        <MiniStat label="Expenses" plain value={String(expenses.length)} hint={`${lockedCount} locked`} />
        <MiniStat label="Per day" value={formatMoney(days ? total / days : 0, config)} />
      </div>

      <ExpenseList expenses={expenses} today={bounds.today} />
    </>
  );
}
