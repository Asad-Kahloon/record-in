export interface MoneyConfig {
  currency: string;
  locale: string;
}

const cache = new Map<string, Intl.NumberFormat>();

function formatter(key: string, create: () => Intl.NumberFormat) {
  let f = cache.get(key);
  if (!f) {
    f = create();
    cache.set(key, f);
  }
  return f;
}

export function formatMoney(
  amount: number,
  config: MoneyConfig,
  options: { compact?: boolean; signDisplay?: "auto" | "always" | "exceptZero" } = {},
): string {
  const { compact = false, signDisplay = "auto" } = options;
  const f = formatter(`money|${config.locale}|${config.currency}|${compact}|${signDisplay}`, () =>
    new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: 0,
      maximumFractionDigits: compact ? 1 : 2,
      signDisplay,
    }),
  );
  return f.format(Number.isFinite(amount) ? amount : 0);
}

/** Plain grouped number without a currency symbol (axis ticks, inputs). */
export function formatNumber(value: number, locale: string, compact = false): string {
  const f = formatter(`num|${locale}|${compact}`, () =>
    new Intl.NumberFormat(locale, {
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
    }),
  );
  return f.format(Number.isFinite(value) ? value : 0);
}

/**
 * A rate (or converted amount) with as many digits as it needs to mean
 * something: 276.93 · 75.40 · 3.6725 · 0.003609.
 */
export function formatRate(value: number, locale: string): string {
  const abs = Math.abs(value);
  const digits = abs >= 10 ? 2 : abs >= 1 ? 4 : 0;
  const f = formatter(`rate|${locale}|${digits}`, () =>
    new Intl.NumberFormat(
      locale,
      digits ? { minimumFractionDigits: 2, maximumFractionDigits: digits } : { maximumSignificantDigits: 4 },
    ),
  );
  return f.format(Number.isFinite(value) ? value : 0);
}

/** 0.256 → "26%" */
export function formatPercent(ratio: number, locale: string, fractionDigits = 0): string {
  const f = formatter(`pct|${locale}|${fractionDigits}`, () =>
    new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: fractionDigits }),
  );
  return f.format(Number.isFinite(ratio) ? ratio : 0);
}

/** Relative change, or null when there's nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}

/** Symbol only, e.g. "Rs" or "$", for input adornments. */
export function currencySymbol(config: MoneyConfig): string {
  const parts = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? config.currency;
}

export function initials(name: string, fallback = "?"): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || fallback;
}

export function displayName(user: { full_name?: string | null; email?: string | null }): string {
  return user.full_name?.trim() || user.email?.split("@")[0] || "Unknown";
}
