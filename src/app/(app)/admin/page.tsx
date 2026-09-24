import { ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { UserActions } from "@/components/admin/user-actions";
import { DownloadButton } from "@/components/download-button";
import { MiniStat } from "@/components/mini-stat";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminOverview, requireSuperadmin } from "@/lib/data";
import { formatDate, formatMonth, monthBounds, resolveMonth, timeAgo } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { displayName, formatMoney } from "@/lib/format";
import { getRatesInto } from "@/lib/rates";
import type { AdminUserRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "All accounts" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireSuperadmin();
  const config = getAppConfig(profile.currency);
  const month = resolveMonth((await searchParams).month, config);
  const bounds = monthBounds(config);
  const overview = await getAdminOverview(month);
  const money = (n: number | null) => (n === null ? "—" : formatMoney(n, config));

  // Each account keeps its own main currency; household totals are converted into yours.
  const mixed = overview.users.some((u) => (u.currency ?? config.currency) !== config.currency);
  const rates = mixed ? await getRatesInto(config.currency) : null;
  const householdTotal = (pick: (u: AdminUserRow) => number) => {
    let total = 0;
    for (const u of overview.users) {
      const from = u.currency ?? config.currency;
      const rate = from === config.currency ? 1 : rates?.[from];
      if (!rate) return null;
      total += pick(u) * rate;
    }
    return total;
  };
  const monthIncome = householdTotal((u) => u.month_income);
  const monthExpense = householdTotal((u) => u.month_expense);
  const totalExpense = householdTotal((u) => u.total_expense);
  const net = monthIncome !== null && monthExpense !== null ? monthIncome - monthExpense : null;

  return (
    <>
      <PageHeader
        title="All accounts"
        description={`Everyone's numbers for ${formatMonth(month, config.locale)}.`}
        actions={
          <>
            <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
            <DownloadButton href={`/api/export?scope=all&month=${month}`} label="Everyone · month" className="flex-1 md:flex-none" />
            <DownloadButton href="/api/export?scope=all" label="Everyone · all-time" className="flex-1 md:flex-none" />
          </>
        }
      />

      <Alert className="border-brand/25 bg-brand/5">
        <ShieldCheckIcon className="text-brand!" />
        <AlertTitle>Super admin view</AlertTitle>
        <AlertDescription>
          You can see and download every account. Entries can only be changed by the person who added them.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-4">
        <MiniStat
          label="Accounts"
          plain
          value={String(overview.totals.users)}
          hint={`${overview.totals.active_users} active`}
        />
        <MiniStat label="Income this month" value={money(monthIncome)} tone="income" hint={mixed ? `In ${config.currency}, today's rates` : undefined} />
        <MiniStat label="Spent this month" value={money(monthExpense)} tone="expense" hint={mixed ? `In ${config.currency}, today's rates` : undefined} />
        <MiniStat
          label={net === null || net >= 0 ? "Left over" : "Overspent"}
          value={money(net === null ? null : Math.abs(net))}
          tone="brand"
          hint={`${money(totalExpense)} spent all-time`}
        />
      </div>

      <div className="grid gap-4 @3xl/main:grid-cols-2">
        {overview.users.map((user) => (
          <AccountCard
            key={user.id}
            user={user}
            month={month}
            isSelf={user.id === profile.id}
            money={(n: number) => formatMoney(n, { currency: user.currency ?? config.currency, locale: config.locale })}
            locale={config.locale}
          />
        ))}
      </div>
    </>
  );
}

function AccountCard({
  user,
  month,
  isSelf,
  money,
  locale,
}: {
  user: AdminUserRow;
  month: string;
  isSelf: boolean;
  money: (n: number) => string;
  locale: string;
}) {
  const name = displayName(user);
  const left = user.month_income - user.month_expense;
  const href = isSelf ? `/dashboard?month=${month}` : `/admin/users/${user.id}?month=${month}`;

  return (
    <Card className={cn(!user.is_active && "opacity-70")}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} src={user.avatar_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={href} className="truncate font-medium hover:underline">
                {name}
              </Link>
              {isSelf ? <Badge variant="secondary">You</Badge> : null}
              {user.role === "superadmin" ? <Badge className="bg-brand/15 text-brand">Super admin</Badge> : null}
              {user.currency ? <Badge variant="secondary">{user.currency}</Badge> : null}
              {!user.is_active ? <Badge variant="destructive">Deactivated</Badge> : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <UserActions
            user={{ id: user.id, name, role: user.role, is_active: user.is_active }}
            month={month}
            isSelf={isSelf}
          />
        </div>

        <Link href={href} className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/70">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-income" />
              Income
            </p>
            <p className="money truncate font-semibold">{money(user.month_income)}</p>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-expense" />
              Spent
            </p>
            <p className="money truncate font-semibold">{money(user.month_expense)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{left >= 0 ? "Left" : "Over"}</p>
            <p className={cn("money truncate font-semibold", left < 0 && "text-destructive")}>{money(Math.abs(left))}</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {user.month_count} this month · {money(user.total_expense)} all-time
            {user.borrowed_pending || user.lent_pending ? ` · owes ${money(user.borrowed_pending)} · owed ${money(user.lent_pending)}` : ""}
          </span>
          <span>
            {user.last_activity_at
              ? `Last entry ${timeAgo(user.last_activity_at)}`
              : `Joined ${formatDate(user.created_at.slice(0, 10), locale)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
