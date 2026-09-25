"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addGoalAction, deleteGoalAction, updateGoalAction } from "@/app/actions/goals";
import { AmountInput } from "@/components/amount-input";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDate, todayIn } from "@/lib/dates";
import { addMonths, cadenceMeta, estimateInstalment, GOAL_CADENCES, GOAL_HORIZONS } from "@/lib/goals";
import type { Goal, GoalCadence } from "@/lib/types";
import { fieldErrors as toFieldErrors, goalInput } from "@/lib/validation";

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const config = useAppConfig();
  const money = useMoney();
  const today = todayIn(config.timeZone);

  const [values, setValues] = useState({
    name: goal?.name ?? "",
    amount: goal ? String(goal.amount) : "",
    currency: goal?.currency ?? config.currency,
    cadence: (goal?.cadence ?? "monthly") as GoalCadence,
    targetOn: goal?.target_on ?? addMonths(today, 12),
    note: goal?.note ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors(({ [key as string]: _removed, ...rest }) => rest);
  };

  const meta = cadenceMeta(values.cadence);
  const target = Number(values.amount) || 0;
  // The preview is in the currency being typed, so it matches what you entered.
  const sameCurrency = values.currency === config.currency;
  const estimate = estimateInstalment({
    target,
    saved: goal && sameCurrency ? goal.saved : 0,
    cadence: values.cadence,
    targetOn: values.targetOn,
    today,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = goalInput.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    if (values.targetOn <= today) {
      setErrors({ targetOn: "Pick a date in the future" });
      return;
    }

    startTransition(async () => {
      const result = goal ? await updateGoalAction({ ...values, id: goal.id }) : await addGoalAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      onDone();
    });
  };

  const remove = async () => {
    if (!goal) return false;
    const result = await deleteGoalAction(goal.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(result.message ?? "Removed");
    onDone();
    return true;
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 pb-4">
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="goal-name">What are you saving for?</FieldLabel>
          <Input
            id="goal-name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="A car"
            maxLength={60}
            autoFocus={!goal}
            aria-invalid={!!errors.name || undefined}
            className="h-11 rounded-xl"
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="goal-amount">How much does it cost?</FieldLabel>
          <AmountInput
            id="goal-amount"
            value={values.amount}
            onChange={(value) => set("amount", value)}
            currency={values.currency}
            onCurrencyChange={(value) => set("currency", value)}
            invalid={!!errors.amount}
          />
          <FieldError>{errors.amount}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="goal-date">By when?</FieldLabel>
          <Input
            id="goal-date"
            type="date"
            min={today}
            max="2099-12-31"
            value={values.targetOn}
            onChange={(event) => set("targetOn", event.target.value)}
            aria-invalid={!!errors.targetOn || undefined}
            className="h-11 rounded-xl"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {GOAL_HORIZONS.map((horizon) => {
              const date = addMonths(today, horizon.months);
              return (
                <Button
                  key={horizon.months}
                  type="button"
                  size="sm"
                  variant={values.targetOn === date ? "secondary" : "outline"}
                  className="rounded-full"
                  onClick={() => set("targetOn", date)}
                >
                  {horizon.label}
                </Button>
              );
            })}
          </div>
          <FieldError>{errors.targetOn}</FieldError>
        </Field>

        <Field data-invalid={!!errors.cadence}>
          <FieldLabel htmlFor="goal-cadence">How often will you put money aside?</FieldLabel>
          <ToggleGroup
            id="goal-cadence"
            type="single"
            value={values.cadence}
            onValueChange={(value) => value && set("cadence", value as GoalCadence)}
            className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {GOAL_CADENCES.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-11 rounded-xl border data-[state=on]:border-brand data-[state=on]:bg-brand/15 data-[state=on]:text-brand"
              >
                {option.label.replace("Every ", "")}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldError>{errors.cadence}</FieldError>
        </Field>

        {target > 0 && values.targetOn > today ? (
          <div className="rounded-xl bg-brand/10 p-4 text-sm ring-1 ring-brand/20">
            <p className="text-muted-foreground">To get there you need</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight">
              <span className="money">{money(estimate.instalment, { currency: values.currency })}</span>
              <span className="text-base font-normal text-muted-foreground"> every {meta.unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {estimate.periods} {estimate.periods === 1 ? meta.unit : `${meta.unit}s`} until{" "}
              {formatDate(values.targetOn, config.locale, { day: "numeric", month: "short", year: "numeric" })}
              {goal && sameCurrency && goal.saved > 0 ? " · counts what you have already saved" : ""}
            </p>
          </div>
        ) : null}

        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="goal-note">Note (optional)</FieldLabel>
          <Textarea
            id="goal-note"
            value={values.note}
            onChange={(event) => set("note", event.target.value)}
            maxLength={200}
            rows={2}
            className="rounded-xl"
          />
          <FieldDescription>Anything you want to remember about this aim.</FieldDescription>
          <FieldError>{errors.note}</FieldError>
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        {goal && goal.saved <= 0 ? <DeleteEntryButton noun="aim" disabled={pending} onConfirm={remove} /> : null}
        <Button type="submit" className="h-11 flex-1 rounded-xl text-base" disabled={pending}>
          {pending ? <Spinner /> : null}
          {goal ? "Save changes" : "Create aim"}
        </Button>
      </div>
    </form>
  );
}

export function GoalSheet({
  open,
  goal,
  session,
  onClose,
}: {
  open: boolean;
  goal?: Goal;
  session: number;
  onClose: () => void;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={goal ? "Edit aim" : "New aim"}
      description={
        goal
          ? "Change the target, the date or the rhythm — the instalment is worked out again."
          : "Tell us what it costs and when you want it. We'll work out what to put aside."
      }
    >
      {open ? <GoalForm key={session} goal={goal} onDone={onClose} /> : null}
    </ResponsiveSheet>
  );
}
