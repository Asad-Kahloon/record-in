"use client";

import { PiggyBankIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setGoalStatusAction } from "@/app/actions/goals";
import { GoalCatchUp } from "@/components/goals/goal-catchup";
import { GoalCard, type GoalActions } from "@/components/goals/goal-card";
import { GoalMoneySheet, type MoneyMode } from "@/components/goals/goal-money-sheet";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatDate } from "@/lib/dates";
import type { Goal, GoalSummary } from "@/lib/types";

export function GoalBoard({ goals, summary }: { goals: Goal[]; summary: GoalSummary }) {
  const { locale } = useAppConfig();
  const money = useMoney();
  const [session, setSession] = useState(0);
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null);
  const [moneySheet, setMoneySheet] = useState<{ goal: Goal; mode: MoneyMode } | null>(null);
  const [catchUp, setCatchUp] = useState<Goal | null>(null);
  const [cancelling, setCancelling] = useState<Goal | null>(null);
  const [, startTransition] = useTransition();

  const bump = () => setSession((n) => n + 1);

  const setStatus = (goal: Goal, status: "active" | "paused" | "achieved" | "cancelled") =>
    startTransition(async () => {
      const result = await setGoalStatusAction({ id: goal.id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Updated");
    });

  const actions: GoalActions = {
    onSave: (goal) => {
      bump();
      setMoneySheet({ goal, mode: "save" });
    },
    onWithdraw: (goal) => {
      bump();
      setMoneySheet({ goal, mode: "withdraw" });
    },
    onEdit: (goal) => {
      bump();
      setEditing({ goal });
    },
    onCatchUp: (goal) => setCatchUp(goal),
    onStatus: (goal, status) => {
      if (status === "cancelled") {
        setCancelling(goal);
        return;
      }
      setStatus(goal, status);
    },
  };

  const open = goals.filter((g) => g.status === "active" || g.status === "paused");
  const closed = goals.filter((g) => g.status === "achieved" || g.status === "cancelled");

  return (
    <>
      <Card className="bg-linear-to-br from-brand/12 via-card to-card ring-brand/20" data-tour="aims-wallet">
        <CardHeader>
          <CardDescription>Aims wallet</CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            <span className="money">{money(summary.wallet_total)}</span>
            <span className="text-base font-normal text-muted-foreground"> set aside</span>
          </CardTitle>
          <CardAction>
            <Button
              size="sm"
              onClick={() => {
                bump();
                setEditing({});
              }}
            >
              <PlusIcon />
              New aim
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Due now</p>
              <p className="money truncate font-semibold">{summary.due_amount > 0 ? money(summary.due_amount) : "—"}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Aims running</p>
              <p className="truncate font-semibold">{summary.active_count}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Next instalment</p>
              <p className="truncate font-semibold">
                {summary.next_due_on ? formatDate(summary.next_due_on, locale, { day: "numeric", month: "short" }) : "—"}
              </p>
            </div>
          </div>
          {summary.behind_count > 0 ? (
            <p className="mt-3 text-xs text-warning">
              {summary.behind_count} {summary.behind_count === 1 ? "aim is" : "aims are"} behind. Tap the aim to add time or
              raise the instalment.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <Empty className="border bg-card/60 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-brand/15 text-brand">
              <PiggyBankIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-base">Save for something</EmptyTitle>
            <EmptyDescription>
              A car, a laptop, a trip. Tell us what it costs and when you want it — we&apos;ll split it into daily, weekly,
              monthly or yearly instalments and remind you each time one is due.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => {
                bump();
                setEditing({});
              }}
            >
              <SparklesIcon />
              Create your first aim
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {open.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2" data-tour="aims-list">
          {open.map((goal) => (
            <GoalCard key={goal.id} goal={goal} actions={actions} />
          ))}
        </div>
      ) : null}

      {closed.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Finished</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {closed.map((goal) => (
              <GoalCard key={goal.id} goal={goal} actions={actions} />
            ))}
          </div>
        </div>
      ) : null}

      <GoalSheet open={editing !== null} goal={editing?.goal} session={session} onClose={() => setEditing(null)} />
      <GoalMoneySheet
        goal={moneySheet?.goal ?? null}
        mode={moneySheet?.mode ?? "save"}
        session={session}
        onClose={() => setMoneySheet(null)}
      />
      <GoalCatchUp goal={catchUp} onClose={() => setCatchUp(null)} />

      <AlertDialog open={cancelling !== null} onOpenChange={(open) => !open && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {cancelling?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling && cancelling.saved > 0 ? (
                <>
                  The <span className="money">{money(cancelling.saved)}</span> set aside goes back into your available
                  balance. The history stays, so every penny is still recorded.
                </>
              ) : (
                "The aim stops and moves to Finished. The history stays."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep saving</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelling) setStatus(cancelling, "cancelled");
                setCancelling(null);
              }}
            >
              Cancel aim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
