import { ArrowLeftIcon, EyeIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { DebtList } from "@/components/debts/debt-list";
import { DownloadButton } from "@/components/download-button";
import { ExpenseList } from "@/components/expenses/expense-list";
import { IncomeList } from "@/components/incomes/income-list";
import { MonthSwitcher } from "@/components/month-switcher";
import { ReportTabs } from "@/components/report-tabs";
import { AppConfigProvider } from "@/components/providers/app-config";
import { OverallReport } from "@/components/reports/overall-report";
import { SectionCards } from "@/components/section-cards";
import { UserAvatar } from "@/components/user-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataError,
  getAccount,
  getDebts,
  getExpenses,
  getIncomes,
  getMonthSummary,
  getOverallSummary,
  requireSuperadmin,
} from "@/lib/data";
import { formatDate, formatMonth, monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { displayName } from "@/lib/format";
import type { AccountSummary } from "@/lib/types";
import { idSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Account" };

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "expenses", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "debts", label: "Debts" },
  { value: "overall", label: "Overall" },
];

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AccountPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const profile = await requireSuperadmin();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  if (id === profile.id) redirect("/dashboard");

  let account: AccountSummary;
  try {
    account = await getAccount(id);
  } catch (error) {
    if (error instanceof DataError && error.code === "P0002") notFound();
    throw error;
  }

  const query = await searchParams;
  // Show this account's numbers in its own main currency.
  const config = getAppConfig(account.currency);
  const month = resolveMonth(query.month, config);
  const bounds = monthBounds(config);
  const tab = TABS.some((t) => t.value === query.tab) ? String(query.tab) : "overview";
  const name = displayName(account);
  const isCurrentMonth = month === bounds.current;

  return (
    <AppConfigProvider value={{ ...config, editWindowMinutes: profile.edit_window_minutes }}>
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href={`/admin?month=${month}`}>
            <ArrowLeftIcon />
            All accounts
          </Link>
        </Button>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={name} src={account.avatar_url} size="lg" className="size-12" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
                {account.role === "superadmin" ? <Badge className="bg-brand/15 text-brand">Super admin</Badge> : null}
                {account.currency ? <Badge variant="secondary">{account.currency}</Badge> : null}
                {!account.is_active ? <Badge variant="destructive">Deactivated</Badge> : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {account.email} · joined {formatDate(account.created_at.slice(0, 10), config.locale)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab !== "overall" ? (
              <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
            ) : null}
            <DownloadButton
              href={
                tab === "overall"
                  ? `/api/export?scope=user&user=${id}`
                  : `/api/export?scope=user&user=${id}&month=${month}`
              }
              label={tab === "overall" ? "Download all-time" : "Download month"}
              className="w-full md:w-auto"
            />
          </div>
        </div>
      </div>

      <Alert>
        <EyeIcon />
        <AlertTitle>Read-only</AlertTitle>
        <AlertDescription>
          You&apos;re viewing {name}&apos;s account. You can see and download everything, but only {name} can change
          their entries.
        </AlertDescription>
      </Alert>

      <ReportTabs value={tab} param="tab" options={TABS} />

      {tab === "overview" ? (
        <AccountOverview userId={id} month={month} today={bounds.today} isCurrentMonth={isCurrentMonth} />
      ) : null}
      {tab === "expenses" ? <ExpenseList expenses={await getExpenses(month, id)} today={bounds.today} readOnly /> : null}
      {tab === "income" ? <IncomeList incomes={await getIncomes(month, id)} month={month} readOnly /> : null}
      {tab === "debts" ? <DebtList debts={await getDebts(id)} today={bounds.today} readOnly /> : null}
      {tab === "overall" ? <OverallReport overall={await getOverallSummary(id)} config={config} /> : null}

      <p className="text-center text-xs text-muted-foreground">
        Showing {tab === "overall" ? "all-time data" : formatMonth(month, config.locale)} for {name}.
      </p>
    </AppConfigProvider>
  );
}

async function AccountOverview({
  userId,
  month,
  today,
  isCurrentMonth,
}: {
  userId: string;
  month: string;
  today: string;
  isCurrentMonth: boolean;
}) {
  const summary = await getMonthSummary(month, userId);

  return (
    <>
      <BalanceHero summary={summary} month={month} isCurrentMonth={isCurrentMonth} readOnly />
      <SectionCards summary={summary} month={month} today={today} isCurrentMonth={isCurrentMonth} />
      <div className="grid gap-4 @4xl/main:grid-cols-5">
        <DailySpendChart month={month} daily={summary.daily} className="@4xl/main:col-span-3" />
        <CategoryBreakdown categories={summary.categories} total={summary.expense_total} className="@4xl/main:col-span-2" />
      </div>
    </>
  );
}
