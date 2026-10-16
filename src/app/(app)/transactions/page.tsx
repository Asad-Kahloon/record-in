import type { Metadata } from "next";

import { DownloadButton } from "@/components/download-button";
import { MiniStat } from "@/components/mini-stat";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { TransactionFeed } from "@/components/transactions/transaction-feed";
import { getDebts, getExpenses, getIncomes, requireActiveProfile } from "@/lib/data";
import { formatMonth, monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { buildTransactions, transactionTotals } from "@/lib/transactions";

export const metadata: Metadata = { title: "Transactions" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const month = resolveMonth((await searchParams).month, config);
  const bounds = monthBounds(config);

  const [expenses, incomes, debts] = await Promise.all([getExpenses(month, null), getIncomes(month, null), getDebts(null)]);
  const transactions = buildTransactions({ expenses, incomes, debts, month, timeZone: config.timeZone });
  const totals = transactionTotals(transactions);
  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatMoney(Math.abs(n), config)}`;

  return (
    <>
      <PageHeader
        title="Transactions"
        description={`Every movement of money in ${formatMonth(month, config.locale)}.`}
        actions={
          <>
            <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
            <DownloadButton href={`/api/export?scope=me&month=${month}`} label="Statement" className="flex-1 md:flex-none" />
          </>
        }
      />
      {/* Borrow & lend has its own total: it is never counted as income or spending. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Income" value={formatMoney(totals.income, config)} tone="income" />
        <MiniStat label="Expenses" value={formatMoney(totals.expenses, config)} tone="expense" />
        <MiniStat label="Net" value={signed(totals.net)} tone="brand" hint="Income − expenses" />
        <MiniStat label="Borrow & lend" value={signed(totals.debtNet)} tone="neutral" hint="Not in income or expenses" />
      </div>
      <TransactionFeed transactions={transactions} today={bounds.today} />
    </>
  );
}
