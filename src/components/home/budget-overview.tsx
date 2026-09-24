"use client";

import { ArrowRightIcon, TargetIcon } from "lucide-react";
import Link from "next/link";

import { BudgetMeter } from "@/components/budgets/budget-meter";
import { useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { budgetProgress, daysLeftInMonth } from "@/lib/budgets";
import { categoryIcon } from "@/lib/categories";
import type { Budget, MonthSummary } from "@/lib/types";

export function BudgetOverview({
  budgets,
  summary,
  month,
  today,
  className,
}: {
  budgets: Budget[];
  summary: MonthSummary;
  month: string;
  today: string;
  className?: string;
}) {
  const money = useMoney();
  const progress = budgetProgress(budgets, summary);
  const overall = progress.find((p) => p.category === null);
  const categories = progress
    .filter((p) => p.category)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);
  const daysLeft = daysLeftInMonth(month, today);

  return (
    <Card data-tour="budget" className={className}>
      <CardHeader>
        <CardTitle>Budget</CardTitle>
        <CardDescription>
          {budgets.length === 0 ? "No limits set yet" : daysLeft ? `${daysLeft} days left this month` : "This month is closed"}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/budgets">
              {budgets.length ? "Manage" : "Set up"}
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {overall ? (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight">
                <span className="money">{money(Math.abs(overall.left))}</span>
                <span className="text-sm font-normal text-muted-foreground">{overall.left >= 0 ? " left" : " over"}</span>
              </p>
              <p className="money shrink-0 text-xs text-muted-foreground">of {money(overall.limit)}</p>
            </div>
            <BudgetMeter progress={overall} className="mt-2.5" />
            {daysLeft > 0 && overall.left > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                About <span className="money font-medium text-foreground">{money(overall.left / daysLeft)}</span> a day is
                safe to spend.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chart-3/15 text-chart-3">
              <TargetIcon className="size-5" />
            </span>
            <p className="flex-1 text-sm text-muted-foreground">
              Set a monthly budget to see what&apos;s safe to spend each day.
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/budgets">Set</Link>
            </Button>
          </div>
        )}

        {categories.map((p) => {
          const Icon = categoryIcon(p.category);
          return (
            <div key={p.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="money shrink-0 text-xs text-muted-foreground tabular-nums">
                  {money(p.spent)} / {money(p.limit)}
                </span>
              </div>
              <BudgetMeter progress={p} compact className="mt-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
