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

export interface Debt extends Money {
  id: string;
  user_id: string;
  direction: DebtDirection;
  counterparty: string;
  note: string | null;
  occurred_on: string;
  due_on: string | null;
  settled_on: string | null;
  created_at: string;
  updated_at: string;
  editable_until: string;
  can_edit: boolean;
  is_owner: boolean;
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

/** Monthly spending limit in the main currency. category null = overall budget. */
export interface Budget {
  id: string;
  category: string | null;
  category_name: string | null;
  amount: number;
  updated_at: string;
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
