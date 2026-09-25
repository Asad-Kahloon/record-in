"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveToGoalAction, withdrawFromGoalAction } from "@/app/actions/goals";
import { AmountInput } from "@/components/amount-input";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { addDays, todayIn } from "@/lib/dates";
import { cadenceMeta } from "@/lib/goals";
import type { Goal } from "@/lib/types";

export type MoneyMode = "save" | "withdraw";

function MoneyForm({ goal, mode, onDone }: { goal: Goal; mode: MoneyMode; onDone: () => void }) {
  const config = useAppConfig();
  const money = useMoney();
  const { available } = useEntrySheets();
  const today = todayIn(config.timeZone);
  const meta = cadenceMeta(goal.cadence);
  const saving = mode === "save";

  const suggested = saving ? goal.due_amount || goal.instalment || goal.remaining : goal.saved;
  const [values, setValues] = useState({
    amount: suggested > 0 ? String(Math.round(suggested * 100) / 100) : "",
    currency: config.currency,
    savedOn: today,
    note: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors(({ [key as string]: _removed, ...rest }) => rest);
  };

  const amount = Number(values.amount) || 0;
  const sameCurrency = values.currency === config.currency;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (amount <= 0) {
      setErrors({ amount: "Enter an amount greater than zero" });
      return;
    }
    // In the main currency we can check here; other currencies are checked on the server.
    if (sameCurrency) {
      if (saving && amount > goal.remaining + 0.005) {
        setErrors({ amount: `This aim only needs ${money(goal.remaining)} more` });
        return;
      }
      if (saving && amount > available + 0.005) {
        setErrors({ amount: `You only have ${money(available)} available` });
        return;
      }
      if (!saving && amount > goal.saved + 0.005) {
        setErrors({ amount: `This aim only holds ${money(goal.saved)}` });
        return;
      }
    }

    startTransition(async () => {
      const result = saving
        ? await saveToGoalAction({
            id: goal.id,
            amount: values.amount,
            currency: values.currency,
            savedOn: values.savedOn,
            note: values.note,
          })
        : await withdrawFromGoalAction({ id: goal.id, amount: values.amount, note: values.note });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      onDone();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 pb-4">
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="goal-money-amount">{saving ? "Amount to set aside" : "Amount to take back"}</FieldLabel>
          <AmountInput
            id="goal-money-amount"
            value={values.amount}
            onChange={(value) => set("amount", value)}
            currency={values.currency}
            onCurrencyChange={saving ? (value) => set("currency", value) : undefined}
            invalid={!!errors.amount}
            autoFocus
          />
          <FieldDescription>
            {saving ? (
              <>
                Available to save: <span className="money font-medium text-foreground">{money(available)}</span> · this aim
                still needs <span className="money font-medium text-foreground">{money(goal.remaining)}</span>
              </>
            ) : (
              <>
                This aim holds <span className="money font-medium text-foreground">{money(goal.saved)}</span>. It goes
                straight back into your available balance.
              </>
            )}
          </FieldDescription>
          <FieldError>{errors.amount}</FieldError>
        </Field>

        {saving && goal.due_amount > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                set("currency", config.currency);
                set("amount", String(goal.due_amount));
              }}
            >
              {meta.when === "today" ? "Today's" : `${meta.when.replace("this ", "This ")}'s`} target ·{" "}
              {money(goal.due_amount)}
            </Button>
            {goal.remaining > goal.due_amount ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  set("currency", config.currency);
                  set("amount", String(goal.remaining));
                }}
              >
                All that's left · {money(goal.remaining)}
              </Button>
            ) : null}
          </div>
        ) : null}

        {saving ? (
          <Field data-invalid={!!errors.savedOn}>
            <FieldLabel htmlFor="goal-money-date">Date</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="goal-money-date"
                type="date"
                min={addDays(today, -365)}
                max={today}
                value={values.savedOn}
                onChange={(event) => set("savedOn", event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl"
              />
              <Button
                type="button"
                variant={values.savedOn === today ? "secondary" : "outline"}
                className="h-11 rounded-xl"
                onClick={() => set("savedOn", today)}
              >
                Today
              </Button>
            </div>
            <FieldError>{errors.savedOn}</FieldError>
          </Field>
        ) : null}

        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="goal-money-note">Note (optional)</FieldLabel>
          <Input
            id="goal-money-note"
            value={values.note}
            onChange={(event) => set("note", event.target.value)}
            maxLength={200}
            className="h-11 rounded-xl"
          />
          <FieldError>{errors.note}</FieldError>
        </Field>
      </FieldGroup>

      <Button type="submit" className="h-11 rounded-xl text-base" disabled={pending}>
        {pending ? <Spinner /> : null}
        {saving ? "Set money aside" : "Take it back"}
      </Button>
    </form>
  );
}

export function GoalMoneySheet({
  goal,
  mode,
  session,
  onClose,
}: {
  goal: Goal | null;
  mode: MoneyMode;
  session: number;
  onClose: () => void;
}) {
  return (
    <ResponsiveSheet
      open={goal !== null}
      onOpenChange={(next) => !next && onClose()}
      title={mode === "save" ? `Save towards ${goal?.name ?? "this aim"}` : `Take money back`}
      description={
        mode === "save"
          ? "This leaves your available balance and waits in the aims wallet."
          : "The money returns to your available balance right away."
      }
    >
      {goal ? <MoneyForm key={session} goal={goal} mode={mode} onDone={onClose} /> : null}
    </ResponsiveSheet>
  );
}
