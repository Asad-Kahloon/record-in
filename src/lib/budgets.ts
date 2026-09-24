import { daysInMonth, monthOf } from "@/lib/dates";
import type { Budget, MonthSummary } from "@/lib/types";

export type BudgetStatus = "ok" | "close" | "over";

export interface BudgetProgress {
  key: string;
  category: string | null;
  name: string;
  limit: number;
  spent: number;
  left: number;
  ratio: number;
  status: BudgetStatus;
}

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : 0;
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "close";
  return "ok";
}

/** Days remaining including today, or 0 for months that are over. */
export function daysLeftInMonth(month: string, today: string): number {
  if (month !== monthOf(today)) return month > monthOf(today) ? daysInMonth(month) : 0;
  return daysInMonth(month) - Number(today.slice(8, 10)) + 1;
}

export function budgetProgress(budgets: Budget[], summary: MonthSummary): BudgetProgress[] {
  const spentByCategory = new Map(summary.categories.map((c) => [c.category, c.total]));
  return budgets.map((b) => {
    const spent = b.category ? (spentByCategory.get(b.category) ?? 0) : summary.expense_total;
    return {
      key: b.category ?? "overall",
      category: b.category,
      name: b.category_name ?? "Monthly budget",
      limit: b.amount,
      spent,
      left: b.amount - spent,
      ratio: b.amount > 0 ? spent / b.amount : 0,
      status: budgetStatus(spent, b.amount),
    };
  });
}
