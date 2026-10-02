import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { monthStart } from "@/lib/dates";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountSummary,
  AdminOverview,
  AdminUserRow,
  Balance,
  Budget,
  Category,
  CategoryTotal,
  DailyTotal,
  Debt,
  DebtSummary,
  Expense,
  Goal,
  GoalSaving,
  GoalSummary,
  Income,
  LargestExpense,
  MethodTotal,
  Money,
  MonthKey,
  MonthSummary,
  MonthTotal,
  MyStats,
  NotificationItem,
  OverallSummary,
  Profile,
} from "@/lib/types";

export class DataError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DataError";
  }
}

const SESSION_ERRORS = new Set(["28000", "PGRST301", "PGRST303"]);

export const getSupabase = cache(createClient);

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code && SESSION_ERRORS.has(error.code)) redirect("/login");
    if (error.code === "42501" && error.message.includes("deactivated")) redirect("/suspended");
    throw new DataError(friendlyDbError(error), error.code);
  }
  return data as T;
}

// ─── normalizers (numeric columns can arrive as strings) ─────────────────────

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Money columns arrive as strings from Postgres numerics. */
function withMoney<T extends Money>(row: T): T {
  return { ...row, amount: num(row.amount), rate: num(row.rate) || 1, base_amount: num(row.base_amount) };
}

const totals = <T extends { total: unknown; count: unknown }>(rows: T[] | null | undefined) =>
  (rows ?? []).map((row) => ({ ...row, total: num(row.total), count: num(row.count) }));

const largest = (row: LargestExpense | null | undefined): LargestExpense | null =>
  row ? { ...row, amount: num(row.amount), original_amount: num(row.original_amount) } : null;

function normalizeMonthSummary(raw: MonthSummary): MonthSummary {
  return {
    ...raw,
    income_total: num(raw.income_total),
    income_count: num(raw.income_count),
    expense_total: num(raw.expense_total),
    expense_count: num(raw.expense_count),
    active_days: num(raw.active_days),
    opening_balance: num(raw.opening_balance),
    closing_balance: num(raw.closing_balance),
    available_balance: num(raw.available_balance),
    saved: num(raw.saved),
    saved_total: num(raw.saved_total),
    prev_income_total: num(raw.prev_income_total),
    prev_expense_total: num(raw.prev_expense_total),
    largest_expense: largest(raw.largest_expense),
    daily: totals<DailyTotal>(raw.daily),
    categories: totals<CategoryTotal>(raw.categories),
    payment_methods: totals<MethodTotal>(raw.payment_methods),
  };
}

function normalizeOverall(raw: OverallSummary): OverallSummary {
  return {
    ...raw,
    available: num(raw.available),
    saved_total: num(raw.saved_total),
    income_total: num(raw.income_total),
    expense_total: num(raw.expense_total),
    income_count: num(raw.income_count),
    expense_count: num(raw.expense_count),
    months: (raw.months ?? []).map(
      (m): MonthTotal => ({
        month: String(m.month).slice(0, 7),
        income: num(m.income),
        expense: num(m.expense),
        count: num(m.count),
      }),
    ),
    categories: totals<CategoryTotal>(raw.categories),
    payment_methods: totals<MethodTotal>(raw.payment_methods),
    largest_expense: largest(raw.largest_expense),
  };
}

// ─── session & profile ───────────────────────────────────────────────────────

export const getClaims = cache(async () => {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!(await getClaims())) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) {
    if (error.code && SESSION_ERRORS.has(error.code)) return null;
    throw new DataError(friendlyDbError(error, "Couldn't load your profile."), error.code);
  }
  if (!data) return null;
  const profile = data as Profile;
  return { ...profile, edit_window_minutes: num(profile.edit_window_minutes) || 30 };
});

/** Signed-in user with a profile row, or redirect to /login. */
export async function requireProfile(): Promise<Profile> {
  if (!(await getClaims())) redirect("/login");
  const profile = await getProfile();
  if (!profile) {
    throw new DataError(
      "Your account profile is missing. Run supabase/schema.sql in the Supabase SQL editor, then sign in again.",
    );
  }
  return profile;
}

/** Same as requireProfile, but deactivated accounts go to /suspended. */
export async function requireActiveProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_active) redirect("/suspended");
  if (!profile.currency) redirect("/welcome");
  return profile;
}

export async function requireSuperadmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "superadmin") redirect("/dashboard");
  return profile;
}

/** Sign-in providers on the current session, e.g. ["email", "google"]. */
export async function getAuthProviders(): Promise<string[]> {
  const claims = await getClaims();
  const providers = (claims?.app_metadata as { providers?: unknown } | undefined)?.providers;
  return Array.isArray(providers) ? providers.map(String) : [];
}

// ─── reads ───────────────────────────────────────────────────────────────────

export const getCategories = cache(async (): Promise<Category[]> => rpc<Category[]>("list_categories"));

export const getMonthSummary = cache(
  async (month: MonthKey, userId: string | null): Promise<MonthSummary> =>
    normalizeMonthSummary(
      await rpc<MonthSummary>("get_month_summary", { p_month: monthStart(month), p_user_id: userId }),
    ),
);

export const getOverallSummary = cache(
  async (userId: string | null): Promise<OverallSummary> =>
    normalizeOverall(await rpc<OverallSummary>("get_overall_summary", { p_user_id: userId })),
);

export const getExpenses = cache(async (month: MonthKey, userId: string | null): Promise<Expense[]> => {
  const rows = await rpc<Expense[]>("list_expenses", { p_month: monthStart(month), p_user_id: userId });
  return (rows ?? []).map(withMoney);
});

export const getIncomes = cache(async (month: MonthKey, userId: string | null): Promise<Income[]> => {
  const rows = await rpc<Income[]>("list_incomes", { p_month: monthStart(month), p_user_id: userId });
  return (rows ?? []).map(withMoney);
});

export const getMyStats = cache(async (): Promise<MyStats> => {
  const raw = await rpc<MyStats>("get_my_stats");
  return {
    expense_count: num(raw.expense_count),
    income_count: num(raw.income_count),
    debt_count: num(raw.debt_count),
    expense_total: num(raw.expense_total),
    income_total: num(raw.income_total),
    first_expense_on: raw.first_expense_on ?? null,
  };
});

export const getNotifications = cache(
  async (limit: number): Promise<NotificationItem[]> =>
    (await rpc<NotificationItem[]>("list_notifications", { p_limit: limit })) ?? [],
);

export const getUnreadCount = cache(async (): Promise<number> => {
  try {
    return num(await rpc<number>("get_unread_notification_count"));
  } catch {
    return 0;
  }
});

// ─── super admin ─────────────────────────────────────────────────────────────

export const getAdminOverview = cache(async (month: MonthKey): Promise<AdminOverview> => {
  const raw = await rpc<AdminOverview>("admin_overview", { p_month: monthStart(month) });
  return {
    month: raw.month,
    totals: {
      users: num(raw.totals.users),
      active_users: num(raw.totals.active_users),
    },
    users: (raw.users ?? []).map(
      (u): AdminUserRow => ({
        ...u,
        month_income: num(u.month_income),
        month_expense: num(u.month_expense),
        month_count: num(u.month_count),
        total_income: num(u.total_income),
        total_expense: num(u.total_expense),
        total_count: num(u.total_count),
        borrowed_pending: num(u.borrowed_pending),
        lent_pending: num(u.lent_pending),
      }),
    ),
  };
});

export const getAccount = cache(
  async (userId: string): Promise<AccountSummary> => rpc<AccountSummary>("admin_get_user", { p_user_id: userId }),
);

// ─── borrow & lend ───────────────────────────────────────────────────────────

export const getDebts = cache(async (userId: string | null): Promise<Debt[]> => {
  const rows = await rpc<Debt[]>("list_debts", { p_user_id: userId });
  return (rows ?? []).map((row) => ({
    ...withMoney(row),
    paid: num(row.paid),
    remaining: num(row.remaining),
    open_base: num(row.open_base),
    payments: (row.payments ?? []).map((p) => ({
      ...p,
      amount: num(p.amount),
      rate: num(p.rate) || 1,
      covered: num(p.covered),
      base_amount: num(p.base_amount),
    })),
  }));
});

export const getDebtSummary = cache(async (userId: string | null): Promise<DebtSummary> => {
  const raw = await rpc<DebtSummary>("get_debt_summary", { p_user_id: userId });
  return {
    borrowed_pending: num(raw.borrowed_pending),
    borrowed_pending_count: num(raw.borrowed_pending_count),
    lent_pending: num(raw.lent_pending),
    lent_pending_count: num(raw.lent_pending_count),
    borrowed_settled: num(raw.borrowed_settled),
    lent_settled: num(raw.lent_settled),
    settled_count: num(raw.settled_count),
    overdue_count: num(raw.overdue_count),
  };
});

// ─── budgets ─────────────────────────────────────────────────────────────────

export const getBudgets = cache(async (userId: string | null): Promise<Budget[]> => {
  const rows = await rpc<Budget[]>("list_budgets", { p_user_id: userId });
  return (rows ?? []).map((budget) => ({ ...budget, amount: num(budget.amount) }));
});

/** Money available to spend right now (all months, including borrowed and lent). */
export const getBalance = cache(async (userId: string | null): Promise<Balance> => {
  const raw = await rpc<Balance>("get_balance", { p_user_id: userId });
  return {
    available: num(raw.available),
    income_total: num(raw.income_total),
    expense_total: num(raw.expense_total),
    borrowed_pending: num(raw.borrowed_pending),
    lent_pending: num(raw.lent_pending),
    saved_total: num(raw.saved_total),
    goal_count: num(raw.goal_count),
    currency: raw.currency ?? null,
  };
});

// ─── aims (savings goals) ────────────────────────────────────────────────────

/** PostgREST's code for "no such function" — the schema hasn't been re-run yet. */
const MISSING_FUNCTION = "PGRST202";

/** Keeps the app usable on a database that is still a version behind. */
async function optionalRpc<T>(fn: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    return await rpc<T>(fn, args);
  } catch (error) {
    if (error instanceof DataError && error.code === MISSING_FUNCTION) return fallback;
    throw error;
  }
}

export const getGoals = cache(async (userId: string | null): Promise<Goal[]> => {
  const rows = await optionalRpc<Goal[]>("list_goals", { p_user_id: userId }, []);
  return (rows ?? []).map((goal) => ({
    ...withMoney(goal),
    saved: num(goal.saved),
    remaining: num(goal.remaining),
    progress: num(goal.progress),
    instalment: num(goal.instalment),
    due_amount: num(goal.due_amount),
    saved_this_period: num(goal.saved_this_period),
    periods_left: num(goal.periods_left),
    days_left: num(goal.days_left),
    extended_by: num(goal.extended_by),
    missed_amount: num(goal.missed_amount),
    missed_last: Boolean(goal.missed_last),
    is_overdue: Boolean(goal.is_overdue),
    needs_answer: Boolean(goal.needs_answer),
  }));
});

export const getGoalSavings = cache(
  async (goalId: string | null, userId: string | null = null, limit = 50): Promise<GoalSaving[]> => {
    const rows = await optionalRpc<GoalSaving[]>(
      "list_goal_savings",
      { p_goal_id: goalId, p_limit: limit, p_user_id: userId },
      [],
    );
    return (rows ?? []).map(withMoney);
  },
);

const EMPTY_GOAL_SUMMARY: GoalSummary = {
  wallet_total: 0,
  target_total: 0,
  saved_total: 0,
  active_count: 0,
  paused_count: 0,
  achieved_count: 0,
  due_amount: 0,
  due_count: 0,
  behind_count: 0,
  answer_count: 0,
  next_due_on: null,
  currency: null,
};

export const getGoalSummary = cache(async (userId: string | null): Promise<GoalSummary> => {
  const raw = await optionalRpc<GoalSummary>("get_goal_summary", { p_user_id: userId }, EMPTY_GOAL_SUMMARY);
  return {
    wallet_total: num(raw.wallet_total),
    target_total: num(raw.target_total),
    saved_total: num(raw.saved_total),
    active_count: num(raw.active_count),
    paused_count: num(raw.paused_count),
    achieved_count: num(raw.achieved_count),
    due_amount: num(raw.due_amount),
    due_count: num(raw.due_count),
    behind_count: num(raw.behind_count),
    answer_count: num(raw.answer_count),
    next_due_on: raw.next_due_on ?? null,
    currency: raw.currency ?? null,
  };
});

/**
 * Builds this period's aim reminders (one per aim per period, whatever happens)
 * and hands back the aims still waiting on you. Called when the app is opened.
 */
export const syncGoalReminders = cache(async (): Promise<void> => {
  try {
    await rpc("sync_my_goal_reminders");
  } catch {
    // A reminder that cannot be built must never keep the page from rendering.
  }
});
