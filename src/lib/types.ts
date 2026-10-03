import type { Theme } from "@/lib/theme";

export type Role = "superadmin" | "user";

export type PaymentMethod = "cash" | "card" | "bank" | "wallet" | "other";

export type DebtDirection = "borrowed" | "lent";

/** "YYYY-MM" */
export type MonthKey = string;

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  /** Main currency; null until chosen on first sign-in. */
  currency: string | null;
  /** When the welcome tour was finished; null shows it on next visit. */
  onboarded_at: string | null;
  /** Light or dark, saved with the account (light for accounts from before themes existed). */
  theme: Theme;
  created_at: string;
  edit_window_minutes: number;
}

/** What was typed (amount + currency) and its value in the owner's main currency. */
export interface Money {
  amount: number;
  currency: string;
  rate: number;
  base_amount: number;
}

export interface Expense extends Money {
  id: string;
  user_id: string;
  category: string;
  category_name: string;
  description: string;
  spent_on: string;
  payment_method: PaymentMethod;
  created_at: string;
  updated_at: string;
  editable_until: string;
  can_edit: boolean;
}

export interface Income extends Money {
  id: string;
  user_id: string;
  month: string;
  source: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  editable_until: string;
  can_edit: boolean;
}

/** Money handed back on a debt — all of it, or a part. */
export interface DebtPayment {
  id: string;
  /** What actually changed hands. */
  amount: number;
  currency: string;
  /** Turns `amount` into the debt's currency (1 when they match). */
  rate: number;
  /** How much of the debt this cleared, in the debt's currency. */
  covered: number;
  /** Its share of the debt in the main currency. */
  base_amount: number;
  paid_on: string;
  note: string | null;
  created_at: string;
  editable_until: string;
  can_undo: boolean;
}

export interface Debt extends Money {
  id: string;
  user_id: string;
  direction: DebtDirection;
  counterparty: string;
  note: string | null;
  occurred_on: string;
  due_on: string | null;
  /** Set once everything has been handed back. */
  settled_on: string | null;
  created_at: string;
  updated_at: string;
  editable_until: string;
  can_edit: boolean;
  is_owner: boolean;
  /** Handed back so far / still owed, in the debt's currency. */
  paid: number;
  remaining: number;
  /** Still owed, in the main currency. */
  open_base: number;
  /** Newest first. Empty for debts settled before part repayments existed. */
  payments: DebtPayment[];
}

export interface DebtSummary {
  borrowed_pending: number;
  borrowed_pending_count: number;
  lent_pending: number;
  lent_pending_count: number;
  borrowed_settled: number;
  lent_settled: number;
  settled_count: number;
  overdue_count: number;
}

/** Exchange rates as one consistent snapshot. */
export interface RatesSnapshot {
  /** Units of each supported currency per 1 USD. */
  rates: Record<string, number>;
  /** "live" refreshes about every minute; "daily" is the once-a-day fallback. */
  kind: "live" | "daily";
  /** When the provider produced these numbers (ms since epoch). */
  updatedAt: number;
}

/** Monthly spending limit in the main currency. category null = overall budget. */
export interface Budget {
  id: string;
  category: string | null;
  category_name: string | null;
  amount: number;
  updated_at: string;
}

/** What is actually available to spend, across all months. */
export interface Balance {
  available: number;
  income_total: number;
  expense_total: number;
  borrowed_pending: number;
  lent_pending: number;
  /** Money set aside in aims — out of the balance, but still yours. */
  saved_total: number;
  goal_count: number;
  currency: string | null;
}

export interface Category {
  slug: string;
  name: string;
}

export interface DailyTotal {
  date: string;
  total: number;
  count: number;
}

export interface CategoryTotal {
  category: string;
  name: string;
  total: number;
  count: number;
}

export interface MethodTotal {
  method: PaymentMethod;
  total: number;
  count: number;
}

export interface LargestExpense {
  id: string;
  description: string;
  /** In the main currency. */
  amount: number;
  original_amount: number;
  currency: string;
  category: string;
  spent_on: string;
}

export interface MonthSummary {
  month: string;
  currency: string | null;
  /** Money carried in from earlier months. */
  opening_balance: number;
  /** What was left at the end of this month. */
  closing_balance: number;
  /** Money available right now, across all months. */
  available_balance: number;
  /** Moved into aims this month (minus anything taken back out). */
  saved: number;
  /** What the aims wallet holds in total. */
  saved_total: number;
  income_total: number;
  income_count: number;
  expense_total: number;
  expense_count: number;
  active_days: number;
  prev_income_total: number;
  prev_expense_total: number;
  largest_expense: LargestExpense | null;
  daily: DailyTotal[];
  categories: CategoryTotal[];
  payment_methods: MethodTotal[];
}

export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
  count: number;
}

export interface OverallSummary {
  currency: string | null;
  available: number;
  saved_total: number;
  income_total: number;
  expense_total: number;
  income_count: number;
  expense_count: number;
  first_expense_on: string | null;
  months: MonthTotal[];
  categories: CategoryTotal[];
  payment_methods: MethodTotal[];
  largest_expense: LargestExpense | null;
}

export interface AccountSummary {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  currency: string | null;
  created_at: string;
}

/** Amounts are in that account's own main currency. */
export interface AdminUserRow extends AccountSummary {
  month_income: number;
  month_expense: number;
  month_count: number;
  total_income: number;
  total_expense: number;
  total_count: number;
  borrowed_pending: number;
  lent_pending: number;
  last_activity_at: string | null;
}

export interface AdminOverview {
  month: string;
  totals: { users: number; active_users: number };
  users: AdminUserRow[];
}

export type NotificationType =
  | "expense_added"
  | "expense_updated"
  | "expense_deleted"
  | "income_added"
  | "income_updated"
  | "income_deleted"
  | "debt_added"
  | "debt_updated"
  | "debt_deleted"
  | "debt_settled"
  | "debt_reopened"
  | "debt_payment"
  | "debt_payment_undone"
  | "goal_due"
  | "goal_missed"
  | "goal_saved"
  | "goal_withdrawn"
  | "goal_achieved"
  | "user_joined";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  payload: {
    record_id?: string;
    actor_name?: string;
    amount?: number;
    previous_amount?: number;
    currency?: string | null;
    label?: string;
    category?: string | null;
    direction?: DebtDirection | null;
    date?: string;
    email?: string;
    goal_id?: string;
    cadence?: GoalCadence;
    missed_amount?: number;
    /** Still owed after a repayment, in remaining_currency. */
    remaining?: number;
    remaining_currency?: string;
  };
  actor_id: string | null;
  actor_name: string;
  actor_avatar_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface MyStats {
  expense_count: number;
  income_count: number;
  debt_count: number;
  expense_total: number;
  income_total: number;
  first_expense_on: string | null;
}

export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

/** State shape for forms driven by useActionState. */
export type FormState =
  | {
      error?: string;
      success?: string;
      fieldErrors?: Partial<Record<string, string>>;
      values?: Record<string, string>;
    }
  | undefined;

export type GoalCadence = "daily" | "weekly" | "monthly" | "yearly";
export type GoalStatus = "active" | "paused" | "achieved" | "cancelled";

/** A savings aim, with the plan the database works out for it. */
export interface Goal {
  id: string;
  name: string;
  note: string | null;
  /** Target as it was typed. */
  amount: number;
  currency: string;
  rate: number;
  /** Target in the owner's main currency. */
  base_amount: number;
  cadence: GoalCadence;
  start_on: string;
  target_on: string;
  status: GoalStatus;
  achieved_on: string | null;
  extended_by: number;
  created_at: string;
  /** Set aside so far. */
  saved: number;
  remaining: number;
  /** 0–1. */
  progress: number;
  /** What one period asks for right now. */
  instalment: number;
  /** Still to put in this period. */
  due_amount: number;
  saved_this_period: number;
  period_start: string;
  next_period_on: string;
  periods_left: number;
  days_left: number;
  is_overdue: boolean;
  missed_last: boolean;
  missed_amount: number;
  missed_period: string | null;
  /** The last period fell short and you haven't answered yet. */
  needs_answer: boolean;
}

export interface GoalSaving {
  id: string;
  goal_id: string;
  goal_name: string;
  direction: "in" | "out";
  amount: number;
  currency: string;
  rate: number;
  base_amount: number;
  saved_on: string;
  period_start: string | null;
  note: string | null;
  created_at: string;
}

export interface GoalSummary {
  /** Everything the aims wallet holds. */
  wallet_total: number;
  target_total: number;
  saved_total: number;
  active_count: number;
  paused_count: number;
  achieved_count: number;
  due_amount: number;
  due_count: number;
  behind_count: number;
  answer_count: number;
  next_due_on: string | null;
  currency: string | null;
}
