"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteBudgetAction, setBudgetAction } from "@/app/actions/budgets";
import { AmountInput } from "@/components/amount-input";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { Budget, Category } from "@/lib/types";

export interface BudgetSheetState {
  /** null = the overall monthly budget. */
  category: string | null;
  isNew: boolean;
}

function BudgetForm({
  state,
  budgets,
  categories,
  spent,
  onDone,
}: {
  state: BudgetSheetState;
  budgets: Budget[];
  categories: Category[];
  spent: (category: string | null) => number;
  onDone: () => void;
}) {
  const { currency } = useAppConfig();
  const money = useMoney();
  const existing = state.isNew ? undefined : budgets.find((b) => b.category === state.category);
  const [category, setCategory] = useState(state.category ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, startTransition] = useTransition();

  // New category limits pick their category here; the overall budget and existing limits are fixed.
  const chooseCategory = state.isNew && state.category !== null;
  const target = chooseCategory ? category || null : state.category;
  const available = categories.filter((c) => c.slug === state.category || !budgets.some((b) => b.category === c.slug));

  const save = () =>
    startTransition(async () => {
      const result = await setBudgetAction({ category: target, amount });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      onDone();
    });

  const remove = async () => {
    const result = await deleteBudgetAction(existing?.category ?? null);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(result.message ?? "Removed");
    onDone();
    return true;
  };

  const spentSoFar = chooseCategory && !category ? 0 : spent(target);

  return (
    <form
      noValidate
      className="flex flex-col gap-5 pb-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (chooseCategory && !category) {
          setErrors({ category: "Choose a category" });
          return;
        }
        save();
      }}
    >
      <FieldGroup className="gap-5">
        {chooseCategory ? (
          <Field data-invalid={!!errors.category}>
            <FieldLabel htmlFor="budget-category">Category</FieldLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="budget-category" className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent position="popper">
                {available.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.category}</FieldError>
          </Field>
        ) : null}

        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="budget-amount">Monthly limit</FieldLabel>
          <AmountInput id="budget-amount" value={amount} onChange={setAmount} currency={currency} invalid={!!errors.amount} autoFocus />
          <FieldDescription>
            Spent so far this month: <span className="money font-medium text-foreground">{money(spentSoFar)}</span>
          </FieldDescription>
          <FieldError>{errors.amount}</FieldError>
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        {existing ? <DeleteEntryButton noun="budget" disabled={pending} onConfirm={remove} /> : null}
        <Button type="submit" className="h-11 flex-1 rounded-xl text-base" disabled={pending}>
          {pending ? <Spinner /> : null}
          {existing ? "Save limit" : "Set limit"}
        </Button>
      </div>
    </form>
  );
}

export function BudgetSheet({
  state,
  session,
  onClose,
  budgets,
  categories,
  spent,
}: {
  state: BudgetSheetState | null;
  session: number;
  onClose: () => void;
  budgets: Budget[];
  categories: Category[];
  spent: (category: string | null) => number;
}) {
  const name =
    state?.category === null
      ? "Monthly budget"
      : state?.isNew
        ? "Add a category limit"
        : (categories.find((c) => c.slug === state?.category)?.name ?? "Budget");

  return (
    <ResponsiveSheet
      open={state !== null}
      onOpenChange={(open) => !open && onClose()}
      title={name}
      description={state?.category === null ? "A cap on everything you spend in a month." : "A cap for one category."}
    >
      {state ? (
        <BudgetForm key={session} state={state} budgets={budgets} categories={categories} spent={spent} onDone={onClose} />
      ) : null}
    </ResponsiveSheet>
  );
}
