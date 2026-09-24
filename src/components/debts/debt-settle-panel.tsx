"use client";

import { CheckIcon, CircleCheckIcon, HourglassIcon, RotateCcwIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setDebtSettledAction } from "@/app/actions/debts";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, todayIn } from "@/lib/dates";
import type { Debt } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Status + settle / reopen controls. Works even after the edit window has closed. */
export function DebtSettlePanel({ debt, onDone }: { debt: Debt; onDone?: () => void }) {
  const config = useAppConfig();
  const money = useMoney();
  const today = todayIn(config.timeZone);
  const [date, setDate] = useState(today < debt.occurred_on ? debt.occurred_on : today);
  const [pending, startTransition] = useTransition();

  const borrowed = debt.direction === "borrowed";
  const settled = Boolean(debt.settled_on);

  const toggle = (next: boolean) =>
    startTransition(async () => {
      const result = await setDebtSettledAction(debt.id, next, next ? date : undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? (borrowed ? "Marked as paid back" : "Marked as received") : "Marked as pending again");
      onDone?.();
    });

  const amountText =
    money(debt.base_amount) +
    (debt.currency !== config.currency ? ` (${money(debt.amount, { currency: debt.currency })})` : "");

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
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
          <p className="font-medium">
            {settled
              ? borrowed
                ? `Paid back to ${debt.counterparty}`
                : `Received from ${debt.counterparty}`
              : borrowed
                ? `You owe ${debt.counterparty}`
                : `${debt.counterparty} owes you`}
          </p>
          <p className="money text-sm text-muted-foreground">
            {settled && debt.settled_on
              ? `${amountText} · on ${formatDate(debt.settled_on, config.locale)}`
              : `${amountText}${debt.due_on ? ` · due ${formatDate(debt.due_on, config.locale)}` : ""}`}
          </p>
        </div>
      </div>

      {settled ? (
        <Button variant="outline" className="mt-3 h-10 w-full rounded-xl" onClick={() => toggle(false)} disabled={pending}>
          {pending ? <Spinner /> : <RotateCcwIcon />}
          Mark as pending again
        </Button>
      ) : (
        <div className="mt-3 flex gap-2">
          <Input
            type="date"
            value={date}
            min={debt.occurred_on}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            aria-label={borrowed ? "Date you paid it back" : "Date you received it"}
            className="h-10 min-w-0 flex-1 rounded-xl"
          />
          <Button className="h-10 rounded-xl" onClick={() => toggle(true)} disabled={pending || !date}>
            {pending ? <Spinner /> : <CheckIcon />}
            {borrowed ? "Paid back" : "Received"}
          </Button>
        </div>
      )}
    </div>
  );
}
