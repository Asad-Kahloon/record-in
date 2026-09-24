import "server-only";

import { CURRENCY_CODES } from "@/lib/currencies";

// Free, key-less daily rates that include PKR and the Gulf currencies.
const SOURCE = "https://open.er-api.com/v6/latest/USD";
const REVALIDATE_SECONDS = 6 * 60 * 60;

/** Units of each currency per 1 USD. */
type UsdRates = Record<string, number>;

// Last good response, used if the provider is briefly unreachable.
let lastGood: { rates: UsdRates; at: number } | null = null;
const STALE_LIMIT_MS = 48 * 60 * 60 * 1000;

async function usdRates(): Promise<UsdRates | null> {
  try {
    const response = await fetch(SOURCE, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(6000),
    });
    if (response.ok) {
      const json = (await response.json()) as { result?: string; rates?: Record<string, unknown> };
      if (json.result === "success" && json.rates) {
        const rates: UsdRates = {};
        for (const code of CURRENCY_CODES) {
          const value = Number(json.rates[code]);
          if (Number.isFinite(value) && value > 0) rates[code] = value;
        }
        if (rates.USD) {
          lastGood = { rates, at: Date.now() };
          return rates;
        }
      }
    }
  } catch {
    // fall through to the last good copy
  }
  if (lastGood && Date.now() - lastGood.at < STALE_LIMIT_MS) return lastGood.rates;
  console.error("[rates] exchange rates unavailable");
  return null;
}

/** How many `to` units one `from` unit is worth, or null if unknown. */
export async function getRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  const rates = await usdRates();
  if (!rates?.[from] || !rates[to]) return null;
  return rates[to] / rates[from];
}

/** Rate from every supported currency into `base` (for switching main currency). */
export async function getRatesInto(base: string): Promise<Record<string, number> | null> {
  const rates = await usdRates();
  if (!rates?.[base]) return null;
  const out: Record<string, number> = {};
  for (const [code, perUsd] of Object.entries(rates)) {
    out[code] = code === base ? 1 : rates[base] / perUsd;
  }
  return out;
}
