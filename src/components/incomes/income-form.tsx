"use client";

import { BanknoteArrowUpIcon, Clock3Icon, LockIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addIncomeAction, deleteIncomeAction, updateIncomeAction } from "@/app/actions/incomes";
import { AmountInput } from "@/components/amount-input";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { formatTimeLeft, useEditWindow } from "@/components/editable-badge";
import { LockConfirm, LockHint, rememberSkipLockReminder, shouldShowLockReminder } from "@/components/lock-confirm";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { INCOME_SOURCES } from "@/lib/constants";
import { formatMonth, monthOf, monthsBetween, shiftMonth, todayIn } from "@/lib/dates";
import type { Income } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fieldErrors as toFieldErrors, incomeInput } from "@/lib/validation";

export function IncomeForm({
  income,
  defaultMonth,
  onDone,
}: {
  income?: Income;
  defaultMonth?: string;
  onDone: () => void;
}) {
  const isEdit = Boolean(income);
  const config = useAppConfig();
  const money = useMoney();
  const currentMonth = monthOf(todayIn(config.timeZone));

  const [values, setValues] = useState({
    month: income ? income.month.slice(0, 7) : (defaultMonth ?? currentMonth),
    amount: income ? String(income.amount) : "",
    source: income?.source ?? "Salary",
    note: income?.note ?? "",
    currency: income?.currency ?? config.currency,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [dontRemind, setDontRemind] = useState(false);
  const [pending, startTransition] = useTransition();

  const editWindow = useEditWindow(income?.editable_until ?? new Date(0).toISOString(), income?.can_edit ?? false);
  const locked = isEdit && !editWindow.editable;

  const firstMonth = config.startMonth < currentMonth ? config.startMonth : currentMonth;
  const months = monthsBetween(firstMonth, shiftMonth(currentMonth, 1)).reverse();

  const set = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = () =>
    startTransition(async () => {
      const result = income
        ? await updateIncomeAction({ ...values, id: income.id })
        : await addIncomeAction(values);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setStep("form");
        toast.error(result.error);
        return;
      }
      if (!income && dontRemind) rememberSkipLockReminder();
      toast.success(income ? "Income updated" : `${money(Number(values.amount), { currency: values.currency })} income added`);
      onDone();
    });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || locked) return;
    const parsed = incomeInput.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    if (!isEdit && shouldShowLockReminder()) {
      setStep("confirm");
      return;
    }
    save();
  };

  const remove = async () => {
    if (!income) return false;
    const result = await deleteIncomeAction(income.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Income deleted");
    onDone();
    return true;
  };

  if (step === "confirm") {
    return (
      <LockConfirm
        noun="income entry"
        pending={pending}
        dontRemind={dontRemind}
        onDontRemindChange={setDontRemind}
        onBack={() => setStep("form")}
        onConfirm={save}
        summary={
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-income/15 text-income">
              <BanknoteArrowUpIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{values.source.trim()}</p>
              <p className="truncate text-xs text-muted-foreground">{formatMonth(values.month, config.locale)}</p>
            </div>
            <p className="font-semibold">{money(Number(values.amount), { currency: values.currency })}</p>
          </div>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 pb-4">
      {isEdit ? (
        locked ? (
          <Alert>
            <LockIcon />
            <AlertTitle>This income entry is locked</AlertTitle>
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
            <AlertDescription>After that, this entry locks for good.</AlertDescription>
          </Alert>
        )
      ) : null}

      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="income-amount">Amount</FieldLabel>
          <AmountInput
            id="income-amount"
            value={values.amount}
            onChange={(value) => set("amount", value)}
            currency={values.currency}
            onCurrencyChange={(value) => set("currency", value)}
            invalid={!!errors.amount}
            disabled={locked}
            autoFocus={!isEdit}
          />
          <FieldError>{errors.amount}</FieldError>
        </Field>

        <Field data-invalid={!!errors.month}>
          <FieldLabel htmlFor="income-month">Month</FieldLabel>
          <Select value={values.month} onValueChange={(value) => set("month", value)} disabled={locked}>
            <SelectTrigger id="income-month" className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m, config.locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{errors.month}</FieldError>
        </Field>

        <Field data-invalid={!!errors.source}>
          <FieldLabel htmlFor="income-source">Source</FieldLabel>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {INCOME_SOURCES.map((source) => (
              <Button
                key={source}
                type="button"
                size="sm"
                variant="outline"
                disabled={locked}
                onClick={() => set("source", source)}
                className={cn(
                  "shrink-0 rounded-full",
                  values.source === source && "border-brand/50 bg-brand/15 text-foreground",
                )}
              >
                {source}
              </Button>
            ))}
          </div>
          <Input
            id="income-source"
            maxLength={60}
            autoComplete="off"
            value={values.source}
            onChange={(event) => set("source", event.target.value)}
            aria-invalid={!!errors.source || undefined}
            disabled={locked}
            className="h-11 rounded-xl"
          />
          <FieldError>{errors.source}</FieldError>
        </Field>

        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="income-note">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="income-note"
            rows={2}
            maxLength={200}
            placeholder="Anything worth remembering"
            value={values.note}
            onChange={(event) => set("note", event.target.value)}
            disabled={locked}
            className="rounded-xl"
          />
          <FieldError>{errors.note}</FieldError>
        </Field>
      </FieldGroup>

      {!isEdit ? <LockHint noun="income entry" /> : null}

      <div className="flex gap-2">
        {income && !locked ? <DeleteEntryButton noun="income entry" disabled={pending} onConfirm={remove} /> : null}
        <Button type="submit" className="h-11 flex-1 rounded-xl text-base" disabled={pending || locked}>
          {pending ? <Spinner /> : null}
          {isEdit ? "Save changes" : "Add income"}
        </Button>
      </div>
    </form>
  );
}
