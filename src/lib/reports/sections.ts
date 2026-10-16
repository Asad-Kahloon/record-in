export const REPORT_FORMATS = ["pdf", "xlsx"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export type ReportScope = "me" | "user" | "all";

export interface ReportSection {
  key: string;
  label: string;
  hint: string;
  /** Always in the report; shown ticked and locked. */
  required?: boolean;
  /** Only makes sense for one month (budgets are monthly). */
  monthOnly?: boolean;
  /** Needs one account's own currency, so not in the everyone-at-once report. */
  singleAccount?: boolean;
}

export const REPORT_SECTIONS = [
  { key: "summary", label: "Summary", hint: "Income, expenses, net and balance", required: true },
  { key: "entries", label: "Income & expenses", hint: "Every entry with its date, category and amount", required: true },
  { key: "categories", label: "Spending by category", hint: "Totals and share for each category", singleAccount: true },
  { key: "methods", label: "Payment methods", hint: "Cash, card, bank and wallet totals", singleAccount: true },
  { key: "debts", label: "Borrow & lend", hint: "Loans, repayments and what is still owed" },
  { key: "budgets", label: "Budgets", hint: "Each limit against what was spent", monthOnly: true, singleAccount: true },
  { key: "savings", label: "Savings aims", hint: "Money set aside and taken back" },
] as const satisfies readonly ReportSection[];

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"];

export function isReportFormat(value: unknown): value is ReportFormat {
  return value === "pdf" || value === "xlsx";
}

/** Sections that apply to this report at all. */
export function availableSections(options: { monthly: boolean; scope: ReportScope }): ReportSection[] {
  return REPORT_SECTIONS.filter(
    (s: ReportSection) => !(s.monthOnly && !options.monthly) && !(s.singleAccount && options.scope === "all"),
  );
}

/**
 * The sections to build: whatever was ticked, plus every required one, minus
 * anything that doesn't apply. Unknown keys are ignored.
 */
export function resolveSections(
  requested: string | null,
  options: { monthly: boolean; scope: ReportScope },
): Set<ReportSectionKey> {
  const wanted = new Set((requested ?? "").split(",").map((s) => s.trim()));
  const keys = availableSections(options)
    .filter((s) => s.required || wanted.has(s.key))
    .map((s) => s.key as ReportSectionKey);
  return new Set(keys);
}
