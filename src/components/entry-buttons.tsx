"use client";

import { HandCoinsIcon, PlusIcon } from "lucide-react";

import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Button } from "@/components/ui/button";
import type { DebtDirection } from "@/lib/types";

export function AddExpenseButton({ className }: { className?: string }) {
  const { addExpense } = useEntrySheets();
  return (
    <Button onClick={addExpense} className={className}>
      <PlusIcon />
      Add expense
    </Button>
  );
}

export function AddIncomeButton({ month, className }: { month?: string; className?: string }) {
  const { addIncome } = useEntrySheets();
  return (
    <Button onClick={() => addIncome(month)} className={className}>
      <PlusIcon />
      Add income
    </Button>
  );
}

export function AddDebtButton({ direction, className }: { direction?: DebtDirection; className?: string }) {
  const { addDebt } = useEntrySheets();
  return (
    <Button onClick={() => addDebt(direction)} className={className}>
      <HandCoinsIcon />
      Record borrow / lend
    </Button>
  );
}
