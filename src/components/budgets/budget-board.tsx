"use client";

import { PencilIcon, PlusIcon, TargetIcon } from "lucide-react";
import { useState } from "react";

import { BudgetLimits } from "@/components/budgets/budget-limits";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { BudgetSheet, type BudgetSheetState } from "@/components/budgets/budget-sheet";
import { useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { budgetProgress, daysLeftInMonth } from "@/lib/budgets";
import type { Budget, Category, MonthSummary } from "@/lib/types";

export function BudgetBoard({
  budgets,
  summary,
  categories,
  month,
  today,
}: {
  budgets: Budget[];
  summary: MonthSummary;
  categories: Category[];
  month: string;
  today: string;
}) {
  const money = useMoney();
  const [sheet, setSheet] = useState<BudgetSheetState | null>(null);
  const [session, setSession] = useState(0);
  const open = (next: BudgetSheetState) => {
    setSheet(next);
    setSession((n) => n + 1);
  };

  const progress = budgetProgress(budgets, summary);
  const overall = progress.find((p) => p.category === null);
  const daysLeft = daysLeftInMonth(month, today);
  const spentBy = new Map(summary.categories.map((c) => [c.category, c.total]));
  const spent = (category: string | null) => (category ? (spentBy.get(category) ?? 0) : summary.expense_total);

  return (
    <>
      {overall ? (
        <Card className="bg-linear-to-br from-brand/12 via-card to-card ring-brand/20">
          <CardHeader>
            <CardDescription>Monthly budget</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              <span className="money">{money(Math.abs(overall.left))}</span>
              <span className="text-base font-normal text-muted-foreground">{overall.left >= 0 ? " left" : " over"}</span>
            </CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => open({ category: null, isNew: false })}>
                <PencilIcon />
                Edit
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <BudgetMeter progress={overall} />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="money truncate font-semibold">{money(overall.spent)}</p>
              </div>
              <div className="rounded-xl bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Limit</p>
                <p className="money truncate font-semibold">{money(overall.limit)}</p>
              </div>
              <div className="rounded-xl bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Safe per day</p>
                <p className="money truncate font-semibold">
                  {daysLeft > 0 && overall.left > 0 ? money(overall.left / daysLeft) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Empty className="border bg-card/60 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-chart-3/15 text-chart-3">
              <TargetIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-base">Set your monthly budget</EmptyTitle>
            <EmptyDescription>
              One number for everything you spend in a month. You&apos;ll see what&apos;s safe to spend each day and get a
              warning near the limit.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => open({ category: null, isNew: false })}>
              <TargetIcon />
              Set monthly budget
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Category limits</h2>
          <p className="text-sm text-muted-foreground">Caps for the categories you want to watch.</p>
        </div>
        <Button variant="secondary" onClick={() => open({ category: "", isNew: true })}>
          <PlusIcon />
          Add limit
        </Button>
      </div>

      <BudgetLimits progress={progress} summary={summary} onOpen={open} />

      <BudgetSheet
        state={sheet}
        session={session}
        onClose={() => setSheet(null)}
        budgets={budgets}
        categories={categories}
        spent={spent}
      />
    </>
  );
}
