import type { Metadata } from "next";

import { BudgetBoard } from "@/components/budgets/budget-board";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { getBudgets, getCategories, getMonthSummary, requireActiveProfile } from "@/lib/data";
import { monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Budgets" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BudgetsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const month = resolveMonth((await searchParams).month, config);
  const bounds = monthBounds(config);
  const [budgets, summary, categories] = await Promise.all([getBudgets(null), getMonthSummary(month, null), getCategories()]);

  return (
    <>
      <PageHeader
        title="Budgets"
        description={`Monthly limits in ${config.currency}. They apply to every month — change them any time.`}
        actions={<MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />}
      />
      <BudgetBoard budgets={budgets} summary={summary} categories={categories} month={month} today={bounds.today} />
    </>
  );
}
