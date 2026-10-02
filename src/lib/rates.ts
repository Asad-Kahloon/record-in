import "server-only";

import { CURRENCY_CODES } from "@/lib/currencies";
import type { RatesSnapshot } from "@/lib/types";

// Live, key-less rates (updated about every minute) with a once-a-day feed as
// the fallback. Both quote units of each currency per 1 USD and both include
// PKR and the Gulf currencies. Every conversion in the app — entries, the
// rates page, switching main currency — reads the same snapshot, so what you
// see on the rates page is what gets applied.
const LIVE_SOURCE = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const DAILY_SOURCE = "https://open.er-api.com/v6/latest/USD";
const LIVE_REVALIDATE_SECONDS = 30;
const DAILY_REVALIDATE_SECONDS = 60 * 60;

/** Units of each currency per 1 USD. */
type UsdRates = Record<string, number>;

// Last good snapshot, used if both providers are briefly unreachable.
let lastGood: RatesSnapshot | null = null;
const STALE_LIMIT_MS = 48 * 60 * 60 * 1000;

function supported(raw: Record<string, unknown>): UsdRates {
  const rates: UsdRates = {};
  for (const code of CURRENCY_CODES) {
    const value = Number(raw[code]);
    if (Number.isFinite(value) && value > 0) rates[code] = value;
  }
  return rates;
}

async function fromLive(): Promise<RatesSnapshot | null> {
  const response = await fetch(LIVE_SOURCE, {
    next: { revalidate: LIVE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { data?: { currency?: string; rates?: Record<string, unknown> } };
  if (json.data?.currency !== "USD" || !json.data.rates) return null;
  const rates = supported({ ...json.data.rates, USD: 1 });
  // One source per snapshot: if the live feed lacks any currency, use the daily one instead.
  if (CURRENCY_CODES.some((code) => !rates[code])) return null;
  // Cached responses keep their headers, so Date is when the provider answered.
  const updatedAt = Date.parse(response.headers.get("date") ?? "") || Date.now();
  return { rates, kind: "live", updatedAt };
}

async function fromDaily(): Promise<RatesSnapshot | null> {
  const response = await fetch(DAILY_SOURCE, {
    next: { revalidate: DAILY_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    result?: string;
    rates?: Record<string, unknown>;
    time_last_update_unix?: number;
  };
  if (json.result !== "success" || !json.rates) return null;
  const rates = supported(json.rates);
  if (!rates.USD) return null;
  const updatedAt = Number(json.time_last_update_unix) * 1000 || Date.now();
  return { rates, kind: "daily", updatedAt };
}

/** The freshest rates available right now, or null if no provider can be reached. */
export async function getRatesSnapshot(): Promise<RatesSnapshot | null> {
  for (const source of [fromLive, fromDaily]) {
    try {
      const snapshot = await source();
      if (snapshot) {
        lastGood = snapshot;
        return snapshot;
      }
    } catch {
      // try the next source
    }
  }
  if (lastGood && Date.now() - lastGood.updatedAt < STALE_LIMIT_MS) return lastGood;
  console.error("[rates] exchange rates unavailable");
  return null;
}

/** How many `to` units one `from` unit is worth, or null if unknown. */
export async function getRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  const rates = (await getRatesSnapshot())?.rates;
  if (!rates?.[from] || !rates[to]) return null;
  return rates[to] / rates[from];
}

/** Rate from every supported currency into `base` (for switching main currency). */
export async function getRatesInto(base: string): Promise<Record<string, number> | null> {
  const rates = (await getRatesSnapshot())?.rates;
  if (!rates?.[base]) return null;
  const out: Record<string, number> = {};
  for (const [code, perUsd] of Object.entries(rates)) {
    out[code] = code === base ? 1 : rates[base] / perUsd;
  }
  return out;
}
