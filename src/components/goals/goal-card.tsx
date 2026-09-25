"use client";

import {
  CalendarClockIcon,
  CircleCheckIcon,
  EllipsisVerticalIcon,
  PauseIcon,
  PencilIcon,
  PiggyBankIcon,
  PlayIcon,
  TriangleAlertIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/dates";
import { formatPercent } from "@/lib/format";
import { cadenceMeta, goalStatusLabel, goalTone, timeLeftLabel, type GoalTone } from "@/lib/goals";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<GoalTone, { fill: string; track: string; text: string; badge: string }> = {
  "on-track": { fill: "bg-brand", track: "bg-brand/15", text: "text-positive", badge: "bg-positive/12 text-positive" },
  due: { fill: "bg-brand", track: "bg-brand/15", text: "text-brand", badge: "bg-brand/15 text-brand" },
  behind: { fill: "bg-warning", track: "bg-warning/15", text: "text-warning", badge: "bg-warning/15 text-warning" },
  done: { fill: "bg-positive", track: "bg-positive/15", text: "text-positive", badge: "bg-positive/12 text-positive" },
  paused: { fill: "bg-muted-foreground", track: "bg-muted", text: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
};

export interface GoalActions {
  onSave: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onWithdraw: (goal: Goal) => void;
  onStatus: (goal: Goal, status: "active" | "paused" | "achieved" | "cancelled") => void;
  onCatchUp: (goal: Goal) => void;
}

export function GoalCard({ goal, actions }: { goal: Goal; actions: GoalActions }) {
  const { locale } = useAppConfig();
  const money = useMoney();
  const meta = cadenceMeta(goal.cadence);
  const tone = goalTone(goal);
  const colors = TONE[tone];
  const width = Math.min(100, Math.max(goal.saved > 0 ? 2 : 0, goal.progress * 100));
  const isOpen = goal.status === "active" || goal.status === "paused";

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", colors.track, colors.text)}>
            <PiggyBankIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{goal.name}</h3>
              <Badge className={cn("shrink-0 border-0 font-medium", colors.badge)}>{goalStatusLabel(goal)}</Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              <span className="money">{money(goal.base_amount)}</span>
              {" · "}
              {goal.status === "achieved" && goal.achieved_on
                ? `Reached ${formatDate(goal.achieved_on, locale, { day: "numeric", month: "short" })}`
                : `${meta.label.toLowerCase()} · ${timeLeftLabel(goal.days_left)}`}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-1.5 -mt-1 size-8 shrink-0" aria-label={`Options for ${goal.name}`}>
                <EllipsisVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => actions.onEdit(goal)}>
                <PencilIcon />
                Edit aim
              </DropdownMenuItem>
              {goal.saved > 0 ? (
                <DropdownMenuItem onSelect={() => actions.onWithdraw(goal)}>
                  <Undo2Icon />
                  Take money back
                </DropdownMenuItem>
              ) : null}
              {goal.status === "active" ? (
                <DropdownMenuItem onSelect={() => actions.onStatus(goal, "paused")}>
                  <PauseIcon />
                  Pause saving
                </DropdownMenuItem>
              ) : null}
              {goal.status === "paused" ? (
                <DropdownMenuItem onSelect={() => actions.onStatus(goal, "active")}>
                  <PlayIcon />
                  Resume saving
                </DropdownMenuItem>
              ) : null}
              {isOpen && goal.remaining <= 0 ? (
                <DropdownMenuItem onSelect={() => actions.onStatus(goal, "achieved")}>
                  <CircleCheckIcon />
                  Mark as reached
                </DropdownMenuItem>
              ) : null}
              {goal.status !== "cancelled" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => actions.onStatus(goal, "cancelled")}>
                    <XIcon />
                    Cancel aim
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div
            role="meter"
            aria-label={`${goal.name}: saved so far`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(goal.progress * 100)}
            className={cn("h-2.5 overflow-hidden rounded-full", colors.track)}
          >
            <div className={cn("h-full rounded-full transition-[width] duration-500", colors.fill)} style={{ width: `${width}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={cn("font-medium", colors.text)}>{formatPercent(goal.progress, locale)} saved</span>
            <span className="text-muted-foreground">
              <span className="money">{money(goal.saved)}</span> of <span className="money">{money(goal.base_amount)}</span>
            </span>
          </div>
        </div>

        {goal.needs_answer ? (
          <button
            type="button"
            onClick={() => actions.onCatchUp(goal)}
            className="flex w-full items-center gap-2 rounded-xl bg-warning/12 px-3 py-2.5 text-left text-sm text-warning transition-colors hover:bg-warning/20"
          >
            <TriangleAlertIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Last {meta.unit} was short by <span className="money font-semibold">{money(goal.missed_amount)}</span>
            </span>
            <span className="shrink-0 font-medium underline underline-offset-4">Fix it</span>
          </button>
        ) : null}

        {isOpen ? (
          <div className="flex items-center gap-2">
            <Button
              className="h-11 flex-1 rounded-xl"
              variant={goal.due_amount > 0 ? "default" : "secondary"}
              onClick={() => actions.onSave(goal)}
              disabled={goal.remaining <= 0}
            >
              <PiggyBankIcon />
              {goal.remaining <= 0
                ? "Fully funded"
                : goal.due_amount > 0
                  ? `Save ${money(goal.due_amount)} ${meta.when}`
                  : "Add more"}
            </Button>
          </div>
        ) : null}

        {isOpen && goal.remaining > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClockIcon className="size-3.5 shrink-0" />
            <span className="money">{money(goal.instalment)}</span> {meta.extra} for {goal.periods_left}{" "}
            {goal.periods_left === 1 ? meta.unit : `${meta.unit}s`} · by{" "}
            {formatDate(goal.target_on, locale, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
