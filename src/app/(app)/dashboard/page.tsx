import type { Metadata } from "next";

import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { ActivityBanner, ActivityCard } from "@/components/dashboard/activity";
import { AimsCard, AimsDueBanner } from "@/components/dashboard/aims-card";
import { DebtsCard } from "@/components/dashboard/debts-card";
import { BankCard } from "@/components/home/bank-card";
import { BudgetOverview } from "@/components/home/budget-overview";
import { InsightsGrid } from "@/components/home/insights-grid";
import { QuickActions } from "@/components/home/quick-actions";
import { MonthSwitcher } from "@/components/month-switcher";
import { RecentTransactions } from "@/components/transactions/recent-transactions";
import {
  getBudgets,
  getDebts,
  getDebtSummary,
  getExpenses,
  getGoalSummary,
  getGoals,
  getIncomes,
  getMonthSummary,
  getNotifications,
  requireActiveProfile,
  syncGoalReminders,
} from "@/lib/data";
import { greeting, monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { displayName } from "@/lib/format";
import { buildTransactions } from "@/lib/transactions";

export const metadata: Metadata = { title: "Home" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const month = resolveMonth((await searchParams).month, config);
  const bounds = monthBounds(config);
  const isCurrentMonth = month === bounds.current;
  const isSuperadmin = profile.role === "superadmin";

  // Opening Home is what builds this period's aim reminders.
  await syncGoalReminders();

  const [summary, expenses, incomes, debts, debtSummary, budgets, goals, goalSummary, activity] = await Promise.all([
    getMonthSummary(month, null),
    getExpenses(month, null),
    getIncomes(month, null),
    getDebts(null),
    getDebtSummary(null),
    getBudgets(null),
    getGoals(null),
    getGoalSummary(null),
    isSuperadmin ? getNotifications(5) : Promise.resolve([]),
  ]);

  const transactions = buildTransactions({ expenses, incomes, debts, month, timeZone: config.timeZone });
  const name = displayName(profile);

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting(config.timeZone)},</p>
          <h1 className="text-2xl font-semibold tracking-tight">{name.split(" ")[0]}</h1>
        </div>
        <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
      </div>

      {isSuperadmin ? <ActivityBanner items={activity} /> : null}
      <AimsDueBanner goals={goals} />

      <div className="grid gap-4 @4xl/main:grid-cols-2">
        <div className="flex flex-col gap-4">
          <BankCard summary={summary} month={month} holder={name} isCurrentMonth={isCurrentMonth} />
          <QuickActions month={month} />
        </div>
        <div className="flex flex-col gap-4">
          <BudgetOverview budgets={budgets} summary={summary} month={month} today={bounds.today} />
          <InsightsGrid summary={summary} month={month} today={bounds.today} isCurrentMonth={isCurrentMonth} />
        </div>
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-5">
        <RecentTransactions
          transactions={transactions.slice(0, 7)}
          today={bounds.today}
          href={isCurrentMonth ? "/transactions" : `/transactions?month=${month}`}
          className="@4xl/main:col-span-3"
        />
        <div className="flex flex-col gap-4 @4xl/main:col-span-2">
          <DebtsCard summary={debtSummary} />
          <AimsCard goals={goals} summary={goalSummary} />
          <DailySpendChart month={month} daily={summary.daily} />
          {isSuperadmin && activity.length ? <ActivityCard items={activity} /> : null}
        </div>
      </div>
    </>
  );
}
