"use client";

import { ArrowDownToLineIcon, ArrowUpFromLineIcon, HandCoinsIcon, TargetIcon } from "lucide-react";
import Link from "next/link";

import { useEntrySheets } from "@/components/providers/entry-sheets";
import { cn } from "@/lib/utils";

export function QuickActions({ month }: { month: string }) {
  const { addExpense, addIncome, addDebt } = useEntrySheets();

  const actions = [
    { label: "Expense", icon: ArrowUpFromLineIcon, tone: "bg-expense/15 text-expense", onClick: addExpense },
    { label: "Income", icon: ArrowDownToLineIcon, tone: "bg-income/15 text-income", onClick: () => addIncome(month) },
    { label: "Borrow/Lend", icon: HandCoinsIcon, tone: "bg-brand/15 text-brand", onClick: () => addDebt() },
    { label: "Budgets", icon: TargetIcon, tone: "bg-chart-3/15 text-chart-3", href: "/budgets" },
  ];

  return (
    <div data-tour="quick-actions" className="grid grid-cols-4 gap-1 rounded-3xl bg-card p-2.5 ring-1 ring-foreground/10">
      {actions.map((action) => {
        const inner = (
          <>
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl transition-transform group-active:scale-95",
                action.tone,
              )}
            >
              <action.icon className="size-5.5" />
            </span>
            <span className="text-[11px] font-semibold">{action.label}</span>
          </>
        );
        const className = "group flex flex-col items-center gap-2 rounded-2xl py-2 transition-colors hover:bg-muted/50";
        return action.href ? (
          <Link key={action.label} href={action.href} className={className}>
            {inner}
          </Link>
        ) : (
          <button key={action.label} type="button" onClick={action.onClick} className={className}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
