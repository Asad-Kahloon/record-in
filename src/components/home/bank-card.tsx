"use client";

import { ArrowDownToLineIcon, ArrowUpFromLineIcon, NfcIcon, PlusIcon } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { PrivacyToggle } from "@/components/providers/privacy";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { formatMonth } from "@/lib/dates";
import { formatPercent } from "@/lib/format";
import type { MonthSummary } from "@/lib/types";

/** The hero balance, dressed as a premium debit card. */
export function BankCard({
  summary,
  month,
  holder,
  readOnly = false,
}: {
  summary: MonthSummary;
  month: string;
  holder: string;
  readOnly?: boolean;
}) {
  const money = useMoney();
  const { currency, locale } = useAppConfig();
  const { addIncome } = useEntrySheets();

  const income = summary.income_total;
  const spent = summary.expense_total;
  const balance = income - spent;
  const share = income > 0 ? spent / income : 0;
  const label = income > 0 ? (balance >= 0 ? "Available this month" : "Spent over income") : "Spent this month";

  return (
    <div className="flex flex-col gap-3">
      <div
        data-tour="balance"
        className="relative isolate overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_24px_60px_-28px_rgba(90,75,209,0.9)] sm:p-6"
        style={{ background: "linear-gradient(135deg, #5b4bd6 0%, #4336b8 45%, #221c6b 100%)" }}
      >
        <div aria-hidden className="absolute -top-24 -right-16 -z-10 size-64 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="absolute -bottom-28 -left-12 -z-10 size-56 rounded-full bg-[#199e70]/30 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.06]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)" }}
        />

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <BrandMark className="size-7 from-white to-white/75 text-[#2a2380] shadow-none" />
            {APP_NAME}
          </span>
          <div className="-mr-2 flex items-center gap-1">
            <NfcIcon className="size-5 opacity-70" aria-hidden />
            <PrivacyToggle className="text-white hover:bg-white/15 hover:text-white dark:hover:bg-white/15" />
          </div>
        </div>

        <div className="mt-5 space-y-1">
          <p className="text-sm text-white/75">{label}</p>
          <p className="money text-4xl font-semibold tracking-tight break-all sm:text-5xl">
            {money(income > 0 ? Math.abs(balance) : spent)}
          </p>
        </div>

        {income > 0 ? (
          <div className="mt-4 space-y-1.5">
            <div
              role="meter"
              aria-label="Share of income spent"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              className="h-1.5 overflow-hidden rounded-full bg-white/20"
            >
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} />
            </div>
            <p className="text-xs text-white/75">{formatPercent(share, locale)} of income spent</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.18em] text-white/60 uppercase">Card holder</p>
            <p className="mt-0.5 truncate text-xs font-semibold tracking-wider uppercase">{holder}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] tracking-[0.18em] text-white/60 uppercase">Statement</p>
            <p className="mt-0.5 text-xs font-semibold tracking-wider uppercase">
              {formatMonth(month, locale, "short")} · {currency}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-income/15 text-income">
              <ArrowDownToLineIcon className="size-3.5" />
            </span>
            Income
          </p>
          <p className="money mt-1.5 truncate text-lg font-semibold">{money(income)}</p>
        </div>
        <div className="rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-expense/15 text-expense">
              <ArrowUpFromLineIcon className="size-3.5" />
            </span>
            Spent
          </p>
          <p className="money mt-1.5 truncate text-lg font-semibold">{money(spent)}</p>
        </div>
      </div>

      {income === 0 && !readOnly ? (
        <Button variant="secondary" className="h-11 rounded-2xl" onClick={() => addIncome(month)}>
          <PlusIcon />
          Add {formatMonth(month, locale).split(" ")[0]} income
        </Button>
      ) : null}
    </div>
  );
}
