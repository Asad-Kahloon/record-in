"use client";

import { BudgetMeter } from "@/components/budgets/budget-meter";
import type { BudgetSheetState } from "@/components/budgets/budget-sheet";
import { useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import type { BudgetProgress } from "@/lib/budgets";
import { categoryIcon } from "@/lib/categories";
import type { MonthSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BudgetLimits({
  progress,
  summary,
  onOpen,
}: {
  progress: BudgetProgress[];
  summary: MonthSummary;
  onOpen: (state: BudgetSheetState) => void;
}) {
  const money = useMoney();
  const limits = progress.filter((p) => p.category !== null).sort((a, b) => b.ratio - a.ratio);
  const budgeted = new Set(limits.map((p) => p.category));
  const unbudgeted = summary.categories.filter((c) => !budgeted.has(c.category)).slice(0, 4);

  return (
    <>
      {limits.length ? (
        <div className="grid gap-3 @3xl/main:grid-cols-2">
          {limits.map((p) => {
            const Icon = categoryIcon(p.category);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onOpen({ category: p.category, isNew: false })}
                className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-5 text-foreground/80" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="money truncate text-xs text-muted-foreground">
                      {money(p.spent)} of {money(p.limit)}
                    </p>
                  </div>
                  <p className={cn("shrink-0 text-sm font-semibold", p.left < 0 && "text-destructive")}>
                    <span className="money">{money(Math.abs(p.left))}</span>
                    <span className="font-normal text-muted-foreground">{p.left >= 0 ? " left" : " over"}</span>
                  </p>
                </div>
                <BudgetMeter progress={p} />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          No category limits yet. Add one for categories where spending tends to creep up.
        </p>
      )}

      {unbudgeted.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Spending without a limit this month</h3>
          <div className="flex flex-wrap gap-2">
            {unbudgeted.map((c) => {
              const Icon = categoryIcon(c.category);
              return (
                <Button
                  key={c.category}
                  variant="outline"
                  className="h-auto rounded-full py-2"
                  onClick={() => onOpen({ category: c.category, isNew: true })}
                >
                  <Icon />
                  {c.name}
                  <span className="money text-muted-foreground">{money(c.total)}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
