"use client";

import { ArrowRightIcon, PiggyBankIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveToGoalAction } from "@/app/actions/goals";
import { useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cadenceMeta, goalsNeedingAction } from "@/lib/goals";
import type { Goal, GoalSummary } from "@/lib/types";

/** One tap: "I saved this period's target." */
function SaveNow({ goal, size = "sm" }: { goal: Goal; size?: "sm" | "default" }) {
  const money = useMoney();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const save = () =>
    startTransition(async () => {
      const result = await saveToGoalAction({ id: goal.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone(true);
      toast.success(result.message ?? "Money set aside");
    });

  return (
    <Button size={size} className="shrink-0 rounded-full" onClick={save} disabled={pending || done}>
      {pending ? <Spinner /> : null}
      {done ? "Saved" : `Save ${money(goal.due_amount)}`}
    </Button>
  );
}

/** Sits at the top of Home when an aim wants money or an answer today. */
export function AimsDueBanner({ goals }: { goals: Goal[] }) {
  const money = useMoney();
  const waiting = goalsNeedingAction(goals);
  const first = waiting[0];
  if (!first) return null;

  const meta = cadenceMeta(first.cadence);

  if (first.needs_answer) {
    return (
      <Link
        href="/goals"
        className="flex items-center gap-3 rounded-2xl bg-warning/12 p-4 ring-1 ring-warning/25 transition-colors hover:bg-warning/20"
      >
        <TriangleAlertIcon className="size-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {first.name} missed last {meta.unit}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Short by <span className="money">{money(first.missed_amount)}</span> — add time, or save a bit more.
          </p>
        </div>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-brand/10 p-4 ring-1 ring-brand/20">
      <PiggyBankIcon className="size-5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Put <span className="money">{money(first.due_amount)}</span> towards {first.name} {meta.when}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {waiting.length > 1 ? `${waiting.length - 1} more aim${waiting.length > 2 ? "s" : ""} waiting · ` : ""}
          It moves out of your balance into the aims wallet.
        </p>
      </div>
      <SaveNow goal={first} />
    </div>
  );
}

export function AimsCard({ goals, summary }: { goals: Goal[]; summary: GoalSummary }) {
  const money = useMoney();
  const active = goals.filter((g) => g.status === "active").slice(0, 3);

  return (
    <Card data-tour="aims">
      <CardHeader>
        <CardDescription>Aims wallet</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          <span className="money">{money(summary.wallet_total)}</span>
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/goals">
              Open
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Saving for a car, a laptop or a trip? Set an aim and we&apos;ll split it into instalments.
          </p>
        ) : (
          active.map((goal) => (
            <div key={goal.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{goal.name}</p>
                  <p className="money shrink-0 text-xs text-muted-foreground">
                    {money(goal.saved)} / {money(goal.base_amount)}
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand/15">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-500"
                    style={{ width: `${Math.min(100, Math.max(goal.saved > 0 ? 2 : 0, goal.progress * 100))}%` }}
                  />
                </div>
              </div>
              {goal.due_amount > 0 ? <SaveNow goal={goal} /> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
