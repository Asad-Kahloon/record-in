"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DebtForm } from "@/components/debts/debt-form";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { IncomeForm } from "@/components/incomes/income-form";
import { QuickAddOptions } from "@/components/quick-add-options";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import type { Category, Debt, DebtDirection, Expense, Income } from "@/lib/types";

type SheetState =
  | { kind: "expense"; expense?: Expense }
  | { kind: "income"; income?: Income; month?: string }
  | { kind: "debt"; debt?: Debt; direction?: DebtDirection }
  | { kind: "quick" }
  | null;

interface EntrySheets {
  /** Money available to spend right now — shown in the forms. */
  available: number;
  /** "What do you want to add?" chooser used by the + buttons. */
  openQuickAdd: () => void;
  addExpense: () => void;
  openExpense: (expense: Expense) => void;
  addIncome: (month?: string) => void;
  openIncome: (income: Income) => void;
  addDebt: (direction?: DebtDirection) => void;
  openDebt: (debt: Debt) => void;
}

const EntrySheetsContext = createContext<EntrySheets | null>(null);

function sheetText(state: SheetState): { title: string; description?: string } {
  switch (state?.kind) {
    case "expense":
      if (!state.expense) return { title: "Add expense", description: "Log what you spent — it only takes a few seconds." };
      return { title: state.expense.can_edit ? "Edit expense" : "Expense details" };
    case "income":
      if (!state.income) return { title: "Add income", description: "Record money coming in for the month." };
      return { title: state.income.can_edit ? "Edit income" : "Income details" };
    case "quick":
      return { title: "Add a transaction", description: "What would you like to record?" };
    case "debt":
      if (!state.debt) return { title: "Borrow or lend", description: "Keep track of money you owe and money owed to you." };
      return { title: state.debt.counterparty };
    default:
      return { title: "" };
  }
}

export function EntrySheetsProvider({
  categories,
  available,
  children,
}: {
  categories: Category[];
  available: number;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SheetState>(null);
  const [open, setOpen] = useState(false);
  // Bumped on every open so each form starts from a clean slate.
  const [session, setSession] = useState(0);

  const show = useCallback((next: SheetState) => {
    setState(next);
    setSession((n) => n + 1);
    setOpen(true);
  }, []);

  const api = useMemo<Omit<EntrySheets, "available">>(
    () => ({
      openQuickAdd: () => show({ kind: "quick" }),
      addExpense: () => show({ kind: "expense" }),
      openExpense: (expense) => show({ kind: "expense", expense }),
      addIncome: (month) => show({ kind: "income", month }),
      openIncome: (income) => show({ kind: "income", income }),
      addDebt: (direction) => show({ kind: "debt", direction }),
      openDebt: (debt) => show({ kind: "debt", debt }),
    }),
    [show],
  );

  const value = useMemo(() => ({ ...api, available }), [api, available]);
  const close = useCallback(() => setOpen(false), []);
  const text = sheetText(state);

  return (
    <EntrySheetsContext.Provider value={value}>
      {children}
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={text.title} description={text.description}>
        {state?.kind === "quick" ? (
          <QuickAddOptions
            onPick={(kind) => {
              if (kind === "expense") api.addExpense();
              else if (kind === "income") api.addIncome();
              else api.addDebt();
            }}
          />
        ) : null}
        {state?.kind === "expense" ? (
          <ExpenseForm key={session} expense={state.expense} categories={categories} onDone={close} />
        ) : null}
        {state?.kind === "income" ? (
          <IncomeForm key={session} income={state.income} defaultMonth={state.month} onDone={close} />
        ) : null}
        {state?.kind === "debt" ? (
          <DebtForm key={session} debt={state.debt} defaultDirection={state.direction} onDone={close} />
        ) : null}
      </ResponsiveSheet>
    </EntrySheetsContext.Provider>
  );
}

export function useEntrySheets(): EntrySheets {
  const context = useContext(EntrySheetsContext);
  if (!context) throw new Error("useEntrySheets must be used inside <EntrySheetsProvider>");
  return context;
}
