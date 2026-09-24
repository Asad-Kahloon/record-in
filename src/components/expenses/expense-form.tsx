"use client";

import { ChevronDownIcon, Clock3Icon, LockIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { AmountInput } from "@/components/amount-input";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { formatTimeLeft, useEditWindow } from "@/components/editable-badge";
import { LockConfirm, LockHint, rememberSkipLockReminder, shouldShowLockReminder } from "@/components/lock-confirm";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryIcon, PAYMENT_METHOD_OPTIONS } from "@/lib/categories";
import { addDays, formatDate, formatTime, todayIn } from "@/lib/dates";
import type { Category, Expense } from "@/lib/types";
import { cn } from "@/lib/utils";
import { expenseInput, fieldErrors as toFieldErrors } from "@/lib/validation";

const PRIMARY_CATEGORY_COUNT = 8;

const chipClass =
  "h-auto min-w-0 flex-col gap-1.5 rounded-xl border border-transparent bg-muted/50 px-1 py-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted data-[state=on]:border-brand/50 data-[state=on]:bg-brand/15 data-[state=on]:text-foreground";

function shortCategoryName(name: string) {
  return name.split(" & ")[0];
}

export function ExpenseForm({
  expense,
  categories,
  onDone,
}: {
  expense?: Expense;
  categories: Category[];
  onDone: () => void;
}) {
  const isEdit = Boolean(expense);
  const config = useAppConfig();
  const money = useMoney();
  const { available } = useEntrySheets();
  const today = todayIn(config.timeZone);
  const yesterday = addDays(today, -1);

  const [values, setValues] = useState({
    amount: expense ? String(expense.amount) : "",
    category: expense?.category ?? "",
    description: expense?.description ?? "",
    spentOn: expense?.spent_on ?? today,
    paymentMethod: expense?.payment_method ?? "cash",
    currency: expense?.currency ?? config.currency,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [dontRemind, setDontRemind] = useState(false);
  const [showAll, setShowAll] = useState(
    () => categories.findIndex((c) => c.slug === expense?.category) >= PRIMARY_CATEGORY_COUNT,
  );
  const [pending, startTransition] = useTransition();

  const editWindow = useEditWindow(expense?.editable_until ?? new Date(0).toISOString(), expense?.can_edit ?? false);
  const locked = isEdit && !editWindow.editable;

  const set = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const parsed = expenseInput.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return false;
    }
    if (values.spentOn > today) {
      setErrors({ spentOn: "The date can't be in the future" });
      return false;
    }
    // Money can only go out if it is there. Other currencies are checked on the server.
    if (values.currency === config.currency) {
      const allowance = available + (expense?.base_amount ?? 0);
      if (Number(values.amount) > allowance) {
        setErrors({ amount: `That is more than the ${money(allowance)} you have available` });
        return false;
      }
    }
    return true;
  };

  const save = () =>
    startTransition(async () => {
      if (expense) {
        const result = await updateExpenseAction({ ...values, id: expense.id });
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }
        toast.success("Expense updated");
        onDone();
        return;
      }

      const result = await addExpenseAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setStep("form");
        toast.error(result.error);
        return;
      }
      if (dontRemind) rememberSkipLockReminder();
      toast.success(`${money(Number(values.amount), { currency: values.currency })} expense added`, {
        description: `You can edit it until ${formatTime(result.data.editableUntil, config.locale, config.timeZone)}.`,
      });
      onDone();
    });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || locked || !validate()) return;
    if (!isEdit && shouldShowLockReminder()) {
      setStep("confirm");
      return;
    }
    save();
  };

  const remove = async () => {
    if (!expense) return false;
    const result = await deleteExpenseAction(expense.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Expense deleted");
    onDone();
    return true;
  };

  if (step === "confirm") {
    const Icon = categoryIcon(values.category);
    const category = categories.find((c) => c.slug === values.category);
    return (
      <LockConfirm
        noun="expense"
        pending={pending}
        dontRemind={dontRemind}
        onDontRemindChange={setDontRemind}
        onBack={() => setStep("form")}
        onConfirm={save}
        summary={
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-expense/15 text-expense">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{values.description.trim()}</p>
              <p className="truncate text-xs text-muted-foreground">
                {category?.name} · {formatDate(values.spentOn, config.locale)}
              </p>
            </div>
            <p className="font-semibold">{money(Number(values.amount), { currency: values.currency })}</p>
          </div>
        }
      />
    );
  }

  const visibleCategories = showAll ? categories : categories.slice(0, PRIMARY_CATEGORY_COUNT);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 pb-4">
      {isEdit ? (
        locked ? (
          <Alert>
            <LockIcon />
            <AlertTitle>This expense is locked</AlertTitle>
            <AlertDescription>
              Entries can only be changed within {config.editWindowMinutes} minutes of adding them.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-brand/25 bg-brand/5">
            <Clock3Icon className="text-brand!" />
            <AlertTitle className="tabular-nums">
              {editWindow.msLeft === null ? "Still editable" : `${formatTimeLeft(editWindow.msLeft)} left to make changes`}
            </AlertTitle>
            <AlertDescription>After that, this expense locks for good.</AlertDescription>
          </Alert>
        )
      ) : null}

      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
          <AmountInput
            id="expense-amount"
            value={values.amount}
            onChange={(value) => set("amount", value)}
            currency={values.currency}
            onCurrencyChange={(value) => set("currency", value)}
            invalid={!!errors.amount}
            disabled={locked}
            autoFocus={!isEdit}
          />
          <FieldDescription>
            Available to spend: <span className="money font-medium text-foreground">{money(available)}</span>
          </FieldDescription>
          <FieldError>{errors.amount}</FieldError>
        </Field>

        <Field data-invalid={!!errors.category}>
          <FieldLabel>Category</FieldLabel>
          <ToggleGroup
            type="single"
            value={values.category}
            onValueChange={(value) => value && set("category", value)}
            spacing={2}
            disabled={locked}
            aria-label="Category"
            className="grid w-full grid-cols-4 gap-2"
          >
            {visibleCategories.map((category) => {
              const Icon = categoryIcon(category.slug);
              return (
                <ToggleGroupItem key={category.slug} value={category.slug} aria-label={category.name} className={chipClass}>
                  <Icon className="size-5!" />
                  <span className="w-full truncate">{shortCategoryName(category.name)}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          {categories.length > PRIMARY_CATEGORY_COUNT ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit! text-muted-foreground"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Fewer categories" : `All ${categories.length} categories`}
              <ChevronDownIcon className={cn("transition-transform", showAll && "rotate-180")} />
            </Button>
          ) : null}
          <FieldError>{errors.category}</FieldError>
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="expense-description">Description</FieldLabel>
          <Input
            id="expense-description"
            placeholder="e.g. Weekly groceries"
            maxLength={120}
            autoComplete="off"
            enterKeyHint="done"
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            aria-invalid={!!errors.description || undefined}
            disabled={locked}
            className="h-11 rounded-xl"
          />
          <FieldError>{errors.description}</FieldError>
        </Field>

        <Field data-invalid={!!errors.spentOn}>
          <FieldLabel htmlFor="expense-date">Date</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="expense-date"
              type="date"
              min={`${config.startMonth}-01`}
              max={today}
              value={values.spentOn}
              onChange={(event) => set("spentOn", event.target.value)}
              aria-invalid={!!errors.spentOn || undefined}
              disabled={locked}
              className="h-11 min-w-0 flex-1 rounded-xl"
            />
            <Button
              type="button"
              variant={values.spentOn === today ? "secondary" : "outline"}
              className="h-11 rounded-xl"
              onClick={() => set("spentOn", today)}
              disabled={locked}
            >
              Today
            </Button>
            <Button
              type="button"
              variant={values.spentOn === yesterday ? "secondary" : "outline"}
              className="h-11 rounded-xl"
              onClick={() => set("spentOn", yesterday)}
              disabled={locked}
            >
              Yesterday
            </Button>
          </div>
          <FieldError>{errors.spentOn}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Paid with</FieldLabel>
          <ToggleGroup
            type="single"
            value={values.paymentMethod}
            onValueChange={(value) => value && set("paymentMethod", value)}
            spacing={2}
            disabled={locked}
            aria-label="Payment method"
            className="grid w-full grid-cols-5 gap-2"
          >
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <ToggleGroupItem key={method.value} value={method.value} className={chipClass}>
                <method.icon className="size-4.5!" />
                {method.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </FieldGroup>

      {!isEdit ? <LockHint noun="expense" /> : null}

      <div className="flex gap-2">
        {expense && !locked ? <DeleteEntryButton noun="expense" disabled={pending} onConfirm={remove} /> : null}
        <Button type="submit" className="h-11 flex-1 rounded-xl text-base" disabled={pending || locked}>
          {pending ? <Spinner /> : null}
          {isEdit ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
