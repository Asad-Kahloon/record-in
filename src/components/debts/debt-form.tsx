"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon, Clock3Icon, LockIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addDebtAction, deleteDebtAction, updateDebtAction } from "@/app/actions/debts";
import { AmountInput } from "@/components/amount-input";
import { DebtSettlePanel } from "@/components/debts/debt-settle-panel";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { formatTimeLeft, useEditWindow } from "@/components/editable-badge";
import { LockConfirm, LockHint, rememberSkipLockReminder, shouldShowLockReminder } from "@/components/lock-confirm";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { UserAvatar } from "@/components/user-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addDays, formatDate, todayIn } from "@/lib/dates";
import type { Debt, DebtDirection } from "@/lib/types";
import { debtInput, fieldErrors as toFieldErrors } from "@/lib/validation";

export const DIRECTIONS: Record<DebtDirection, { label: string; hint: string; icon: typeof ArrowDownLeftIcon }> = {
  borrowed: { label: "I borrowed", hint: "Someone gave me money", icon: ArrowDownLeftIcon },
  lent: { label: "I lent", hint: "I gave someone money", icon: ArrowUpRightIcon },
};

export function DebtForm({
  debt,
  defaultDirection = "borrowed",
  onDone,
}: {
  debt?: Debt;
  defaultDirection?: DebtDirection;
  onDone: () => void;
}) {
  const isEdit = Boolean(debt);
  const config = useAppConfig();
  const money = useMoney();
  const today = todayIn(config.timeZone);
  const yesterday = addDays(today, -1);

  const [values, setValues] = useState({
    direction: (debt?.direction ?? defaultDirection) as string,
    counterparty: debt?.counterparty ?? "",
    amount: debt ? String(debt.amount) : "",
    currency: debt?.currency ?? config.currency,
    occurredOn: debt?.occurred_on ?? today,
    dueOn: debt?.due_on ?? "",
    note: debt?.note ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [dontRemind, setDontRemind] = useState(false);
  const [pending, startTransition] = useTransition();

  const editWindow = useEditWindow(debt?.editable_until ?? new Date(0).toISOString(), debt?.can_edit ?? false);
  const locked = isEdit && !editWindow.editable;
  const borrowed = values.direction === "borrowed";

  const set = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = () =>
    startTransition(async () => {
      const result = debt ? await updateDebtAction({ ...values, id: debt.id }) : await addDebtAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setStep("form");
        toast.error(result.error);
        return;
      }
      if (!debt && dontRemind) rememberSkipLockReminder();
      const who = values.counterparty.trim();
      toast.success(debt ? "Saved" : borrowed ? `Recorded — you owe ${who}` : `Recorded — ${who} owes you`);
      onDone();
    });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || locked) return;
    const parsed = debtInput.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    if (values.occurredOn > today) {
      setErrors({ occurredOn: "The date can't be in the future" });
      return;
    }
    if (!isEdit && shouldShowLockReminder()) {
      setStep("confirm");
      return;
    }
    save();
  };

  const remove = async () => {
    if (!debt) return false;
    const result = await deleteDebtAction(debt.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Deleted");
    onDone();
    return true;
  };

  if (step === "confirm") {
    return (
      <LockConfirm
        noun="entry"
        pending={pending}
        dontRemind={dontRemind}
        onDontRemindChange={setDontRemind}
        onBack={() => setStep("form")}
        onConfirm={save}
        summary={
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-3">
            <UserAvatar name={values.counterparty} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{values.counterparty.trim()}</p>
              <p className="truncate text-xs text-muted-foreground">
                {borrowed ? "You borrowed" : "You lent"} · {formatDate(values.occurredOn, config.locale)}
              </p>
            </div>
            <p className="font-semibold">{money(Number(values.amount), { currency: values.currency })}</p>
          </div>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 pb-4">
      {debt?.is_owner ? <DebtSettlePanel debt={debt} onDone={onDone} /> : null}

      {isEdit ? (
        locked ? (
          <Alert>
            <LockIcon />
            <AlertTitle>Details are locked</AlertTitle>
            <AlertDescription>
              Details can only be changed within {config.editWindowMinutes} minutes of adding them. You can still mark it
              as settled above.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-brand/25 bg-brand/5">
            <Clock3Icon className="text-brand!" />
            <AlertTitle className="tabular-nums">
              {editWindow.msLeft === null ? "Still editable" : `${formatTimeLeft(editWindow.msLeft)} left to edit details`}
            </AlertTitle>
            <AlertDescription>Settling it stays available after that.</AlertDescription>
          </Alert>
        )
      ) : null}

      <FieldGroup className="gap-5">
        <ToggleGroup
          type="single"
          value={values.direction}
          onValueChange={(value) => value && set("direction", value)}
          spacing={2}
          disabled={locked}
          aria-label="Borrowed or lent"
          className="grid w-full grid-cols-2 gap-2"
        >
          {(Object.keys(DIRECTIONS) as DebtDirection[]).map((key) => {
            const option = DIRECTIONS[key];
            return (
              <ToggleGroupItem
                key={key}
                value={key}
                className="h-auto min-w-0 flex-col items-start gap-1 rounded-2xl border border-transparent bg-muted/50 p-3 text-left hover:bg-muted data-[state=on]:border-brand/50 data-[state=on]:bg-brand/15"
              >
                <option.icon className={key === "borrowed" ? "size-5! text-income" : "size-5! text-expense"} />
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="w-full truncate text-xs font-normal text-muted-foreground">{option.hint}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        <Field data-invalid={!!errors.counterparty}>
          <FieldLabel htmlFor="debt-person">{borrowed ? "Who lent you the money?" : "Who did you lend to?"}</FieldLabel>
          <Input
            id="debt-person"
            placeholder="e.g. Ali, a friend, the bank"
            maxLength={80}
            autoComplete="off"
            value={values.counterparty}
            onChange={(event) => set("counterparty", event.target.value)}
            aria-invalid={!!errors.counterparty || undefined}
            disabled={locked}
            className="h-11 rounded-xl"
          />
          <FieldError>{errors.counterparty}</FieldError>
        </Field>

        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="debt-amount">Amount</FieldLabel>
          <AmountInput
            id="debt-amount"
            value={values.amount}
            onChange={(value) => set("amount", value)}
            currency={values.currency}
            onCurrencyChange={(value) => set("currency", value)}
            invalid={!!errors.amount}
            disabled={locked}
          />
          <FieldError>{errors.amount}</FieldError>
        </Field>

        <Field data-invalid={!!errors.occurredOn}>
          <FieldLabel htmlFor="debt-date">{borrowed ? "Date borrowed" : "Date lent"}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="debt-date"
              type="date"
              min="2020-01-01"
              max={today}
              value={values.occurredOn}
              onChange={(event) => set("occurredOn", event.target.value)}
              disabled={locked}
              className="h-11 min-w-0 flex-1 rounded-xl"
            />
            <Button type="button" variant={values.occurredOn === today ? "secondary" : "outline"} className="h-11 rounded-xl" onClick={() => set("occurredOn", today)} disabled={locked}>
              Today
            </Button>
            <Button type="button" variant={values.occurredOn === yesterday ? "secondary" : "outline"} className="h-11 rounded-xl" onClick={() => set("occurredOn", yesterday)} disabled={locked}>
              Yesterday
            </Button>
          </div>
          <FieldError>{errors.occurredOn}</FieldError>
        </Field>

        <Field data-invalid={!!errors.dueOn}>
          <FieldLabel htmlFor="debt-due">
            {borrowed ? "Pay back by" : "Expect it back by"} <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="debt-due"
            type="date"
            min={values.occurredOn}
            value={values.dueOn}
            onChange={(event) => set("dueOn", event.target.value)}
            disabled={locked}
            className="h-11 rounded-xl"
          />
          <FieldDescription>We&apos;ll flag it as overdue after this date.</FieldDescription>
          <FieldError>{errors.dueOn}</FieldError>
        </Field>

        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="debt-note">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="debt-note"
            rows={2}
            maxLength={200}
            placeholder="What was it for?"
            value={values.note}
            onChange={(event) => set("note", event.target.value)}
            disabled={locked}
            className="rounded-xl"
          />
          <FieldError>{errors.note}</FieldError>
        </Field>
      </FieldGroup>

      {!isEdit ? <LockHint noun="entry" /> : null}

      {!locked ? (
        <div className="flex gap-2">
          {debt ? <DeleteEntryButton noun="entry" disabled={pending} onConfirm={remove} /> : null}
          <Button type="submit" className="h-11 flex-1 rounded-xl text-base" disabled={pending}>
            {pending ? <Spinner /> : null}
            {isEdit ? "Save changes" : borrowed ? "Record borrowed money" : "Record lent money"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
