import type { Goal, GoalCadence } from "@/lib/types";

export interface CadenceMeta {
  value: GoalCadence;
  /** "Every week" — how the rhythm is offered. */
  label: string;
  /** "week" — the period itself. */
  unit: string;
  /** "this week" — when the next instalment is wanted. */
  when: string;
  /** "a week" — used in sentences about adding time. */
  extra: string;
}

export const GOAL_CADENCES: CadenceMeta[] = [
  { value: "daily", label: "Every day", unit: "day", when: "today", extra: "a day" },
  { value: "weekly", label: "Every week", unit: "week", when: "this week", extra: "a week" },
  { value: "monthly", label: "Every month", unit: "month", when: "this month", extra: "a month" },
  { value: "yearly", label: "Every year", unit: "year", when: "this year", extra: "a year" },
];

export function cadenceMeta(cadence: GoalCadence): CadenceMeta {
  return GOAL_CADENCES.find((c) => c.value === cadence) ?? GOAL_CADENCES[2];
}

/** Ready-made deadlines, so "in about 3 years" is one tap. */
export const GOAL_HORIZONS = [
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
  { months: 36, label: "3 years" },
  { months: 60, label: "5 years" },
];

const DAY = 86_400_000;
const utc = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addMonths(date: string, months: number): string {
  const year = +date.slice(0, 4);
  const month = +date.slice(5, 7) - 1 + months;
  const day = +date.slice(8, 10);
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return iso(Date.UTC(year, month, Math.min(day, last)));
}

/** The first day of the period a date falls in — weeks start on Monday, as in the database. */
export function periodStart(cadence: GoalCadence, date: string): string {
  if (cadence === "daily") return date;
  if (cadence === "monthly") return `${date.slice(0, 7)}-01`;
  if (cadence === "yearly") return `${date.slice(0, 4)}-01-01`;
  const ms = utc(date);
  const monday = (new Date(ms).getUTCDay() + 6) % 7;
  return iso(ms - monday * DAY);
}

/** Periods available for saving, counting this one and the one the deadline is in. */
export function periodsLeft(cadence: GoalCadence, from: string, to: string): number {
  const end = to < from ? from : to;
  let spans = 0;
  if (cadence === "daily") spans = Math.round((utc(end) - utc(from)) / DAY);
  else if (cadence === "weekly")
    spans = Math.round((utc(periodStart("weekly", end)) - utc(periodStart("weekly", from))) / (7 * DAY));
  else if (cadence === "monthly")
    spans = (+end.slice(0, 4) * 12 + +end.slice(5, 7)) - (+from.slice(0, 4) * 12 + +from.slice(5, 7));
  else spans = +end.slice(0, 4) - +from.slice(0, 4);
  return Math.max(1, spans + 1);
}

export interface GoalEstimate {
  remaining: number;
  periods: number;
  instalment: number;
}

/** What one instalment works out at — the same sum the database will make. */
export function estimateInstalment(input: {
  target: number;
  saved?: number;
  cadence: GoalCadence;
  targetOn: string;
  today: string;
}): GoalEstimate {
  const remaining = Math.max(input.target - (input.saved ?? 0), 0);
  const periods = periodsLeft(input.cadence, periodStart(input.cadence, input.today), input.targetOn);
  const instalment = remaining <= 0 ? 0 : Math.min(Math.ceil((remaining / periods) * 100) / 100, remaining);
  return { remaining, periods, instalment };
}

export type GoalTone = "behind" | "due" | "done" | "paused" | "on-track";

export function goalTone(goal: Goal): GoalTone {
  if (goal.status === "achieved") return "done";
  if (goal.status === "paused" || goal.status === "cancelled") return "paused";
  if (goal.missed_last || goal.is_overdue) return "behind";
  if (goal.due_amount > 0) return "due";
  return "on-track";
}

export function goalStatusLabel(goal: Goal): string {
  const meta = cadenceMeta(goal.cadence);
  switch (goalTone(goal)) {
    case "done":
      return "Reached";
    case "paused":
      return goal.status === "cancelled" ? "Cancelled" : "Paused";
    case "behind":
      return goal.is_overdue ? "Past the date" : `Missed last ${meta.unit}`;
    case "due":
      return `Due ${meta.when}`;
    default:
      return `Covered ${meta.when}`;
  }
}

/** "3 years left" / "in 2 months" / "5 days left". */
export function timeLeftLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past`;
  if (days === 0) return "Today";
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} left`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} left`;
  return `${Math.round(months / 12)} years left`;
}

export function activeGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => g.status === "active");
}

/** Aims that want something from you right now, most urgent first. */
export function goalsNeedingAction(goals: Goal[]): Goal[] {
  return activeGoals(goals)
    .filter((g) => g.needs_answer || g.due_amount > 0)
    .sort((a, b) => Number(b.needs_answer) - Number(a.needs_answer) || a.target_on.localeCompare(b.target_on));
}

/** The same date shifted by whole periods — matches the database's interval maths. */
export function addPeriods(cadence: GoalCadence, date: string, count: number): string {
  if (cadence === "daily") return iso(utc(date) + count * DAY);
  if (cadence === "weekly") return iso(utc(date) + count * 7 * DAY);
  if (cadence === "monthly") return addMonths(date, count);
  return addMonths(date, count * 12);
}
