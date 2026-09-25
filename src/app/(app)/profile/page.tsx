import { ArrowRightIcon, Clock3Icon, KeyRoundIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MiniStat } from "@/components/mini-stat";
import { PageHeader } from "@/components/page-header";
import { AppPreferences } from "@/components/profile/app-preferences";
import { CurrencyCard } from "@/components/profile/currency-form";
import { InstallCard } from "@/components/pwa/install-card";
import { PasswordForm, ProfileNameForm, SignOutButton } from "@/components/profile/profile-forms";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAuthProviders, getMyStats, requireActiveProfile } from "@/lib/data";
import { formatDate, formatMonth, monthOf } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { displayName, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Profile" };

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-3" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export default async function ProfilePage() {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const [stats, providers] = await Promise.all([getMyStats(), getAuthProviders()]);
  const name = displayName(profile);
  const hasPassword = providers.includes("email");
  const isSuperadmin = profile.role === "superadmin";

  return (
    <>
      <PageHeader title="Profile" description="Your account, sign-in and stats." />

      <div className="grid gap-4 @4xl/main:grid-cols-3">
        <Card className="@4xl/main:row-span-2">
          <CardContent className="flex flex-col items-center gap-4 pt-2 text-center">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 -z-10 scale-125 rounded-full bg-brand/25 blur-2xl" />
              <UserAvatar name={name} src={profile.avatar_url} className="size-24 text-2xl" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
              <p className="text-sm break-all text-muted-foreground">{profile.email}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {isSuperadmin ? (
                <Badge className="bg-brand/15 text-brand">
                  <ShieldCheckIcon />
                  Super admin
                </Badge>
              ) : null}
              {providers.includes("google") ? (
                <Badge variant="secondary">
                  <GoogleMark />
                  Google
                </Badge>
              ) : null}
              {hasPassword ? (
                <Badge variant="secondary">
                  <MailIcon />
                  Email
                </Badge>
              ) : null}
            </div>
            <Separator />
            <dl className="grid w-full gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Member since</dt>
                <dd>{formatDate(profile.created_at.slice(0, 10), config.locale)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tracking since</dt>
                <dd>{stats.first_expense_on ? formatMonth(monthOf(stats.first_expense_on), config.locale) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{config.currency}</dd>
              </div>
            </dl>
            <SignOutButton className="w-full" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 @4xl/main:col-span-2 @4xl/main:grid-cols-4">
          <MiniStat label="Expenses logged" value={String(stats.expense_count)} plain />
          <MiniStat label="Total spent" value={formatMoney(stats.expense_total, config)} tone="expense" />
          <MiniStat label="Income entries" value={String(stats.income_count)} plain />
          <MiniStat label="Total income" value={formatMoney(stats.income_total, config)} tone="income" />
        </div>

        <div className="flex flex-col gap-4 @4xl/main:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
              <CardDescription>This name is shown to the admin and in exports.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileNameForm defaultName={profile.full_name} />
            </CardContent>
          </Card>

          <CurrencyCard current={config.currency} />

          <AppPreferences />

          <InstallCard />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                Password
              </CardTitle>
              <CardDescription>
                {hasPassword
                  ? "Choose a strong password you don't use anywhere else."
                  : "You sign in with Google, so your password is managed by Google."}
              </CardDescription>
            </CardHeader>
            {hasPassword ? (
              <CardContent>
                <PasswordForm />
              </CardContent>
            ) : null}
          </Card>

          <Card size="sm">
            <CardContent className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
                <Clock3Icon className="size-4.5" />
              </span>
              <div className="text-sm">
                <p className="font-medium">Entries lock after {profile.edit_window_minutes} minutes</p>
                <p className="text-muted-foreground">
                  You can edit or delete an expense, income or borrow/lend entry for {profile.edit_window_minutes}{" "}
                  minutes after adding it. After that it&apos;s kept as a permanent record — though a debt can still be
                  marked as settled.
                </p>
              </div>
            </CardContent>
          </Card>

          {isSuperadmin ? (
            <Button asChild variant="outline" className="h-11 justify-between rounded-xl">
              <Link href="/admin">
                <span className="flex items-center gap-2">
                  <ShieldCheckIcon />
                  Manage all accounts
                </span>
                <ArrowRightIcon />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
