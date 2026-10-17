import "server-only";

import { budgetProgress, type BudgetProgress } from "@/lib/budgets";
import { paymentMethodLabel } from "@/lib/categories";
import { APP_NAME, APP_TAGLINE, CONTACT_PHONE } from "@/lib/constants";
import {
  getAccount,
  getBudgets,
  getDebtSummary,
  getMonthSummary,
  getOverallSummary,
  getProfile,
  getSupabase,
} from "@/lib/data";
import { formatDate, formatDateTime, formatMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { displayName } from "@/lib/format";
import type { ReportScope, ReportSectionKey } from "@/lib/reports/sections";

/** One row as export_transactions returns it. */
interface ExportRow {
  kind: string;
  user_name: string;
  user_email: string;
  entry_date: string;
  category: string;
  description: string;
  payment_method: string | null;
  status: string | null;
  amount: number | string;
  currency: string;
  rate: number | string;
  base_amount: number | string;
  base_currency: string | null;
  created_at: string;
}

export interface ReportLine {
  date: string;
  kind: string;
  kindLabel: string;
  /** Only in the everyone-at-once report. */
  account: string | null;
  /** Category, income source, person or aim. */
  label: string;
  description: string;
  method: string | null;
  status: string | null;
  /** As typed. */
  amount: number;
  currency: string;
  /** In the owner's main currency. */
  base: number;
  baseCurrency: string;
}

export interface SummaryFigure {
  label: string;
  value: number;
  kind: "money" | "count";
  tone?: "income" | "expense" | "brand";
}

export interface AccountTotals {
  name: string;
  email: string;
  currency: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ShareRow {
  name: string;
  total: number;
  count: number;
  share: number;
}

export interface ReportData {
  brand: { name: string; tagline: string; phone: string };
  title: string;
  period: string;
  /** For the file name: "2026-10" or "all-time". */
  periodSlug: string;
  who: string;
  whoDetail: string | null;
  /** Main currency of the single account (null in the everyone report). */
  currency: string | null;
  locale: string;
  generatedAt: string;
  sections: Set<ReportSectionKey>;
  summary: SummaryFigure[];
  accounts: AccountTotals[] | null;
  entries: ReportLine[];
  categories: ShareRow[];
  methods: ShareRow[];
  debts: ReportLine[];
  owed: { owedToYou: number; youOwe: number } | null;
  budgets: BudgetProgress[];
  savings: ReportLine[];
}

export class ReportError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const KIND_LABEL: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  borrowed: "Borrowed",
  lent: "Lent",
  paid_back: "Paid back",
  received_back: "Received back",
  saving: "Set aside",
  saving_returned: "Taken back",
};

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function share(rows: { name: string; total: number; count: number }[], total: number): ShareRow[] {
  return rows
    .map((r) => ({ ...r, share: total > 0 ? r.total / total : 0 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Everything a report needs, read through the same RPCs as the app so the same
 * rules apply: your own data, or (super admin only) someone else's or everyone's.
 */
export async function buildReportData(options: {
  scope: ReportScope;
  userId: string | null;
  month: string | null;
  sections: Set<ReportSectionKey>;
}): Promise<ReportData> {
  const { scope, month, sections } = options;
  const userId = scope === "user" ? options.userId : null;
  const single = scope !== "all";

  // Who the report is about, and in which currency.
  let who = "All accounts";
  let whoDetail: string | null = null;
  let currency: string | null = null;
  if (scope === "user" && userId) {
    const account = await getAccount(userId);
    who = displayName(account);
    whoDetail = account.email;
    currency = account.currency;
  } else if (scope === "me") {
    const profile = await getProfile();
    if (!profile) throw new ReportError("Please sign in.", 401);
    who = displayName(profile);
    whoDetail = profile.email;
    currency = profile.currency;
  }
  const config = getAppConfig(currency);

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("export_transactions", {
    p_user_id: userId,
    p_month: month ? `${month}-01` : null,
    p_all_users: scope === "all",
  });
  if (error) throw new ReportError(friendlyDbError(error), error.code === "42501" ? 403 : 400);

  const lines: ReportLine[] = ((data ?? []) as ExportRow[]).map((r) => ({
    date: r.entry_date,
    kind: r.kind,
    kindLabel: KIND_LABEL[r.kind] ?? r.kind,
    account: single ? null : r.user_name,
    label: r.category,
    description: r.description,
    method: r.kind === "expense" ? paymentMethodLabel(r.payment_method) : null,
    status: r.status,
    amount: num(r.amount),
    currency: r.currency,
    base: num(r.base_amount),
    baseCurrency: r.base_currency ?? config.currency,
  }));
  const byDate = (a: ReportLine, b: ReportLine) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1);
  const entries = lines.filter((l) => l.kind === "income" || l.kind === "expense").sort(byDate);
  const debts = lines.filter((l) => ["borrowed", "lent", "paid_back", "received_back"].includes(l.kind)).sort(byDate);
  const savings = lines.filter((l) => l.kind === "saving" || l.kind === "saving_returned").sort(byDate);

  const report: ReportData = {
    brand: { name: APP_NAME, tagline: APP_TAGLINE, phone: CONTACT_PHONE },
    title: month ? "Monthly report" : "All-time report",
    period: month ? formatMonth(month, config.locale) : "All time",
    periodSlug: month ?? "all-time",
    who,
    whoDetail,
    currency: single ? config.currency : null,
    locale: config.locale,
    generatedAt: formatDateTime(new Date().toISOString(), config.locale, config.timeZone),
    sections,
    summary: [],
    accounts: null,
    entries,
    categories: [],
    methods: [],
    debts,
    owed: null,
    budgets: [],
    savings,
  };

  if (!single) {
    // Each account in its own main currency; never added across currencies.
    const accounts = new Map<string, AccountTotals>();
    for (const l of lines) {
      if (l.kind !== "income" && l.kind !== "expense") continue;
      const key = l.account ?? "";
      const row = accounts.get(key) ?? {
        name: l.account ?? "",
        email: "",
        currency: l.baseCurrency,
        income: 0,
        expenses: 0,
        net: 0,
      };
      if (l.kind === "income") row.income += l.base;
      else row.expenses += l.base;
      row.net = row.income - row.expenses;
      accounts.set(key, row);
    }
    for (const r of (data ?? []) as ExportRow[]) {
      const row = accounts.get(r.user_name);
      if (row && !row.email) row.email = r.user_email;
    }
    report.accounts = [...accounts.values()].sort((a, b) => a.name.localeCompare(b.name));
    return report;
  }

  if (month) {
    const summary = await getMonthSummary(month, userId);
    report.summary = [
      { label: "Income", value: summary.income_total, kind: "money", tone: "income" },
      { label: "Expenses", value: summary.expense_total, kind: "money", tone: "expense" },
      { label: "Net (income − expenses)", value: summary.income_total - summary.expense_total, kind: "money", tone: "brand" },
      { label: "Carried in from earlier months", value: summary.opening_balance, kind: "money" },
      { label: "Left at the end of the month", value: summary.closing_balance, kind: "money" },
      { label: "Set aside in aims this month", value: summary.saved, kind: "money" },
      { label: "Income entries", value: summary.income_count, kind: "count" },
      { label: "Expense entries", value: summary.expense_count, kind: "count" },
    ];
    report.categories = share(
      summary.categories.map((c) => ({ name: c.name, total: c.total, count: c.count })),
      summary.expense_total,
    );
    report.methods = share(
      summary.payment_methods.map((m) => ({ name: paymentMethodLabel(m.method), total: m.total, count: m.count })),
      summary.expense_total,
    );
    if (sections.has("budgets")) {
      report.budgets = budgetProgress(await getBudgets(userId), summary);
    }
  } else {
    const overall = await getOverallSummary(userId);
    report.summary = [
      { label: "Income", value: overall.income_total, kind: "money", tone: "income" },
      { label: "Expenses", value: overall.expense_total, kind: "money", tone: "expense" },
      { label: "Net (income − expenses)", value: overall.income_total - overall.expense_total, kind: "money", tone: "brand" },
      { label: "Available balance now", value: overall.available, kind: "money" },
      { label: "Held in the aims wallet", value: overall.saved_total, kind: "money" },
      { label: "Income entries", value: overall.income_count, kind: "count" },
      { label: "Expense entries", value: overall.expense_count, kind: "count" },
    ];
    if (overall.first_expense_on) {
      report.period = `All time · since ${formatDate(overall.first_expense_on, config.locale)}`;
    }
    report.categories = share(
      overall.categories.map((c) => ({ name: c.name, total: c.total, count: c.count })),
      overall.expense_total,
    );
    report.methods = share(
      overall.payment_methods.map((m) => ({ name: paymentMethodLabel(m.method), total: m.total, count: m.count })),
      overall.expense_total,
    );
  }

  if (sections.has("debts")) {
    const owed = await getDebtSummary(userId);
    report.owed = { owedToYou: owed.lent_pending, youOwe: owed.borrowed_pending };
  }

  return report;
}
