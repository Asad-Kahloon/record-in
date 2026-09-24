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
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Money in" value={formatMoney(totals.moneyIn, config)} tone="income" />
        <MiniStat label="Money out" value={formatMoney(totals.moneyOut, config)} tone="expense" />
        <MiniStat
          label="Net"
          value={`${totals.net >= 0 ? "+" : "−"}${formatMoney(Math.abs(totals.net), config)}`}
          tone="brand"
          hint={`${transactions.length} transactions`}
        />
      </div>
      <TransactionFeed transactions={transactions} today={bounds.today} />
    </>
  );
}
