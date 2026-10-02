"use client";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CircleCheckIcon,
  HandCoinsIcon,
  HourglassIcon,
  RotateCcwIcon,
  Undo2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addDebtPaymentAction, deleteDebtPaymentAction, setDebtSettledAction } from "@/app/actions/debts";
import { AmountInput } from "@/components/amount-input";
import { formatTimeLeft, useEditWindow } from "@/components/editable-badge";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDate, todayIn } from "@/lib/dates";
import { repaidPercent } from "@/lib/debts";
import type { Debt, DebtPayment } from "@/lib/types";
import { cn } from "@/lib/utils";

type Choice = "full" | "half" | "other";

const cents = (n: number) => Math.round(n * 100) / 100;

function undoPayment(paymentId: string) {
  return deleteDebtPaymentAction(paymentId).then((result) => {
    if (result.ok) toast.success("Repayment undone");
    else toast.error(result.error);
    return result.ok;
  });
}

function UndoButton({ payment, label }: { payment: DebtPayment; label: string }) {
  const { editable, msLeft } = useEditWindow(payment.editable_until, payment.can_undo);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editable) return null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 rounded-lg px-2 text-xs tabular-nums">
          <Undo2Icon className="size-3.5" />
          Undo{msLeft !== null ? ` · ${formatTimeLeft(msLeft)}` : ""}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Undo2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Undo this repayment?</AlertDialogTitle>
          <AlertDialogDescription>{label} will count as owed again.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                if (await undoPayment(payment.id)) setOpen(false);
              });
            }}
          >
            {pending ? <Spinner /> : null}
            Undo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Got money back?" — full, half or any amount in any currency. */
function RecordRepayment({ debt, onDone }: { debt: Debt; onDone?: () => void }) {
  const config = useAppConfig();
  const money = useMoney();
  const { available } = useEntrySheets();
  const today = todayIn(config.timeZone);
  const borrowed = debt.direction === "borrowed";
  const inDebt = (n: number) => money(n, { currency: debt.currency });

  const full = cents(debt.remaining);
  const half = cents(debt.remaining / 2);

  const [choice, setChoice] = useState<Choice | "">("");
  const [values, setValues] = useState({
    amount: "",
    currency: debt.currency,
    paidOn: today < debt.occurred_on ? debt.occurred_on : today,
    note: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors(({ [key as string]: _removed, ...rest }) => rest);
  };

  const pick = (next: Choice | "") => {
    setChoice(next);
    setErrors({});
    if (next === "full" || next === "half") {
      setValues((current) => ({ ...current, currency: debt.currency, amount: String(next === "full" ? full : half) }));
    } else if (next === "other") {
      setValues((current) => ({ ...current, amount: "" }));
    }
  };

  const amount = Number(values.amount) || 0;
  const label = amount > 0 ? money(amount, { currency: values.currency }) : "";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (amount <= 0) {
      setErrors({ amount: "Enter an amount greater than zero" });
      return;
    }
    // Same currency can be checked here; a different one is checked on the server.
    if (values.currency === debt.currency && amount > debt.remaining + 0.005) {
      setErrors({ amount: `Only ${inDebt(debt.remaining)} is left` });
      return;
    }
    if (borrowed && values.currency === config.currency && debt.currency === config.currency && amount > available + 0.005) {
      setErrors({ amount: `You only have ${money(available)} available` });
      return;
    }
    if (!values.paidOn || values.paidOn > today) {
      setErrors({ paidOn: "The date can't be in the future" });
      return;
    }

    startTransition(async () => {
      const result = await addDebtPaymentAction({ debtId: debt.id, ...values });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      const { paymentId, remaining, settled } = result.data;
      const who = debt.counterparty;
      const message = settled
        ? borrowed
          ? `Paid back in full — you're square with ${who}`
          : `${who} paid you back in full`
        : borrowed
          ? `Recorded — you still owe ${inDebt(remaining)}`
          : `Recorded — ${who} still owes ${inDebt(remaining)}`;
      toast.success(message, { action: { label: "Undo", onClick: () => void undoPayment(paymentId) } });
      onDone?.();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p className="text-sm font-medium">{borrowed ? `Paid ${debt.counterparty} back?` : "Got money back?"}</p>
      <ToggleGroup
        type="single"
        value={choice}
        onValueChange={(value) => pick(value as Choice | "")}
        spacing={2}
        aria-label="How much was handed back"
        className="grid w-full grid-cols-3 gap-2"
      >
        {(
          [
            { value: "full", title: "Full", hint: inDebt(full) },
            { value: "half", title: "Half", hint: inDebt(half), hidden: half <= 0 || half >= full },
            { value: "other", title: "Other", hint: "Any amount" },
          ] as const
        ).map((option) =>
          "hidden" in option && option.hidden ? null : (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-auto min-w-0 flex-col items-start gap-0.5 rounded-2xl border border-transparent bg-muted/50 p-3 text-left hover:bg-muted data-[state=on]:border-brand/50 data-[state=on]:bg-brand/15"
            >
              <span className="text-sm font-semibold">{option.title}</span>
              <span className="money w-full truncate text-xs font-normal text-muted-foreground">{option.hint}</span>
            </ToggleGroupItem>
          ),
        )}
      </ToggleGroup>

      {choice ? (
        <FieldGroup className="gap-4">
          {choice === "other" ? (
            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="repay-amount">{borrowed ? "Amount you paid back" : "Amount you got back"}</FieldLabel>
              <AmountInput
                id="repay-amount"
                value={values.amount}
                onChange={(value) => set("amount", value)}
                currency={values.currency}
                onCurrencyChange={(value) => set("currency", value)}
                convertTo={debt.currency}
                invalid={!!errors.amount}
                autoFocus
              />
              <FieldDescription>
                Up to <span className="money font-medium text-foreground">{inDebt(debt.remaining)}</span> — in any
                currency; it&apos;s converted at today&apos;s rate.
              </FieldDescription>
              <FieldError>{errors.amount}</FieldError>
            </Field>
          ) : (
            <FieldError>{errors.amount}</FieldError>
          )}

          <Field data-invalid={!!errors.paidOn}>
            <FieldLabel htmlFor="repay-date">{borrowed ? "Date you paid it" : "Date you got it"}</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="repay-date"
                type="date"
                min={debt.occurred_on}
                max={today}
                value={values.paidOn}
                onChange={(event) => set("paidOn", event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl"
              />
              <Button
                type="button"
                variant={values.paidOn === today ? "secondary" : "outline"}
                className="h-11 rounded-xl"
                onClick={() => set("paidOn", today)}
              >
                Today
              </Button>
            </div>
            <FieldError>{errors.paidOn}</FieldError>
          </Field>

          <Field data-invalid={!!errors.note}>
            <FieldLabel htmlFor="repay-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="repay-note"
              value={values.note}
              onChange={(event) => set("note", event.target.value)}
              maxLength={200}
              placeholder="e.g. by bank transfer"
              className="h-11 rounded-xl"
            />
            <FieldError>{errors.note}</FieldError>
          </Field>

          <Button type="submit" className="h-11 rounded-xl text-base" disabled={pending || amount <= 0}>
            {pending ? <Spinner /> : <HandCoinsIcon />}
            {label ? (borrowed ? `Record ${label} paid back` : `Record ${label} received`) : "Record repayment"}
          </Button>
        </FieldGroup>
      ) : null}
    </form>
  );
}

/** What has been handed back, what is left, and the way to record more. */
export function DebtRepayments({ debt, onDone }: { debt: Debt; onDone?: () => void }) {
  const config = useAppConfig();
  const money = useMoney();
  const [pending, startTransition] = useTransition();

  const borrowed = debt.direction === "borrowed";
  const settled = Boolean(debt.settled_on);
  const legacySettled = settled && debt.payments.length === 0;
  const percent = repaidPercent(debt);
  const inDebt = (n: number) => money(n, { currency: debt.currency });
  const otherCurrency = debt.currency !== config.currency;
  const who = debt.counterparty;

  const reopen = () =>
    startTransition(async () => {
      const result = await setDebtSettledAction(debt.id, false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as pending again");
      onDone?.();
    });

  const title = settled
    ? borrowed
      ? `Paid back to ${who} in full`
      : `${who} paid you back in full`
    : borrowed
      ? `You owe ${who}`
      : `${who} owes you`;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4",
          settled ? "border-positive/30 bg-positive/5" : "border-warning/30 bg-warning/5",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              settled ? "bg-positive/15 text-positive" : "bg-warning/15 text-warning",
            )}
          >
            {settled ? <CircleCheckIcon className="size-5" /> : <HourglassIcon className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{title}</p>
            {settled ? (
              <p className="money text-sm text-muted-foreground">
                {inDebt(debt.amount)}
                {debt.settled_on ? ` · settled ${formatDate(debt.settled_on, config.locale)}` : ""}
              </p>
            ) : (
              <>
                <p className="money text-xl font-semibold tracking-tight">
                  {inDebt(debt.remaining)} <span className="text-sm font-normal text-muted-foreground">left</span>
                </p>
                <p className="money text-xs text-muted-foreground">
                  {debt.paid > 0 ? `of ${inDebt(debt.amount)}` : borrowed ? "Nothing paid back yet" : "Nothing back yet"}
                  {otherCurrency ? ` · ≈ ${money(debt.open_base)}` : ""}
                  {debt.due_on ? ` · due ${formatDate(debt.due_on, config.locale)}` : ""}
                </p>
              </>
            )}
          </div>
        </div>

        {!settled && debt.paid > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Progress value={percent} className="h-2 bg-foreground/10 *:data-[slot=progress-indicator]:bg-positive" />
            <p className="money flex justify-between text-xs text-muted-foreground">
              <span>
                {borrowed ? "Paid back" : "Received"} {inDebt(debt.paid)}
              </span>
              <span className="tabular-nums">{Math.floor(percent)}%</span>
            </p>
          </div>
        ) : null}

        {legacySettled ? (
          <Button variant="outline" className="h-10 w-full rounded-xl" onClick={reopen} disabled={pending}>
            {pending ? <Spinner /> : <RotateCcwIcon />}
            Mark as pending again
          </Button>
        ) : null}
      </div>

      {!settled ? <RecordRepayment debt={debt} onDone={onDone} /> : null}

      <div className="flex flex-col gap-1.5">
        <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">History</p>
        <ItemGroup className="gap-0.5 rounded-2xl bg-card p-1 ring-1 ring-foreground/10">
          {debt.payments.map((payment) => {
            const amountText = money(payment.amount, { currency: payment.currency });
            const details = [
              formatDate(payment.paid_on, config.locale),
              payment.currency !== debt.currency ? `${inDebt(payment.covered)} of the debt` : null,
              payment.note,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Item key={payment.id} className="flex-nowrap rounded-xl px-2.5 py-2">
                <ItemMedia>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full",
                      borrowed ? "bg-expense/15 text-expense" : "bg-income/15 text-income",
                    )}
                  >
                    {borrowed ? <ArrowUpRightIcon className="size-4" /> : <ArrowDownLeftIcon className="size-4" />}
                  </span>
                </ItemMedia>
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle className="money w-full truncate">
                    {borrowed ? "Paid back" : "Received"} {amountText}
                  </ItemTitle>
                  <ItemDescription className="truncate text-xs">{details}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <UndoButton payment={payment} label={payment.currency !== debt.currency ? inDebt(payment.covered) : amountText} />
                </ItemActions>
              </Item>
            );
          })}

          {legacySettled && debt.settled_on ? (
            <Item className="flex-nowrap rounded-xl px-2.5 py-2">
              <ItemMedia>
                <span className="flex size-8 items-center justify-center rounded-full bg-positive/15 text-positive">
                  <CircleCheckIcon className="size-4" />
                </span>
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="money w-full truncate">
                  {borrowed ? "Paid back" : "Received"} {inDebt(debt.amount)} in full
                </ItemTitle>
                <ItemDescription className="text-xs">{formatDate(debt.settled_on, config.locale)}</ItemDescription>
              </ItemContent>
            </Item>
          ) : null}

          <Item className="flex-nowrap rounded-xl px-2.5 py-2">
            <ItemMedia>
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {borrowed ? <ArrowDownLeftIcon className="size-4" /> : <ArrowUpRightIcon className="size-4" />}
              </span>
            </ItemMedia>
            <ItemContent className="min-w-0 gap-0">
              <ItemTitle className="money w-full truncate">
                {borrowed ? `Borrowed ${inDebt(debt.amount)}` : `Lent ${inDebt(debt.amount)}`}
              </ItemTitle>
              <ItemDescription className="text-xs">{formatDate(debt.occurred_on, config.locale)}</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </div>
    </div>
  );
}
