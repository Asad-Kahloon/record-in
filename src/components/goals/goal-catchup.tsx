"use client";

import { CalendarPlusIcon, TrendingUpIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { resolveGoalMissAction } from "@/app/actions/goals";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, todayIn } from "@/lib/dates";
import { addPeriods, cadenceMeta, estimateInstalment } from "@/lib/goals";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXTRA_PERIODS = [1, 2, 3, 6];

/**
 * A missed period asks one question, in the user's words: more time, or the
 * same time with a bigger instalment?
 */
export function GoalCatchUp({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const config = useAppConfig();
  const money = useMoney();
  const [periods, setPeriods] = useState(1);
  const [choice, setChoice] = useState<"extend" | "keep">("extend");
  const [pending, startTransition] = useTransition();

  if (!goal) return null;

  const meta = cadenceMeta(goal.cadence);
  const today = todayIn(config.timeZone);
  const extendedOn = addPeriods(goal.cadence, goal.target_on > today ? goal.target_on : today, periods);
  const extended = estimateInstalment({
    target: goal.base_amount,
    saved: goal.saved,
    cadence: goal.cadence,
    targetOn: extendedOn,
    today,
  });

  const confirm = () =>
    startTransition(async () => {
      const result = await resolveGoalMissAction({ id: goal.id, action: choice, periods });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Updated");
      onClose();
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You missed last {meta.unit}</DialogTitle>
          <DialogDescription>
            {goal.name} was short by <span className="money font-medium text-foreground">{money(goal.missed_amount)}</span>.
            What would you like to do?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setChoice("extend")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              choice === "extend" ? "border-brand bg-brand/10" : "hover:bg-muted/50",
            )}
          >
            <p className="flex items-center gap-2 font-medium">
              <CalendarPlusIcon className="size-4 text-brand" />
              Give it more time
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep putting aside about <span className="money">{money(extended.instalment)}</span> {meta.extra} and finish on{" "}
              {formatDate(extendedOn, config.locale, { day: "numeric", month: "short", year: "numeric" })}.
            </p>
            {choice === "extend" ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXTRA_PERIODS.map((count) => (
                  <Button
                    key={count}
                    type="button"
                    size="sm"
                    variant={periods === count ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPeriods(count);
                    }}
                  >
                    +{count} {count === 1 ? meta.unit : `${meta.unit}s`}
                  </Button>
                ))}
              </div>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setChoice("keep")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              choice === "keep" ? "border-brand bg-brand/10" : "hover:bg-muted/50",
            )}
          >
            <p className="flex items-center gap-2 font-medium">
              <TrendingUpIcon className="size-4 text-brand" />
              Keep the date, save a bit more
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay on {formatDate(goal.target_on, config.locale, { day: "numeric", month: "short", year: "numeric" })} by
              putting aside <span className="money">{money(goal.instalment)}</span> {meta.extra} from now on.
            </p>
          </button>
        </div>

        <Button className="h-11 rounded-xl text-base" onClick={confirm} disabled={pending}>
          {pending ? <Spinner /> : null}
          {choice === "extend" ? `Add ${periods} ${periods === 1 ? meta.unit : `${meta.unit}s`}` : "Keep the date"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
