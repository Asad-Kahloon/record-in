import "server-only";

import { getProfile } from "@/lib/data";
import { getRate } from "@/lib/rates";

export type Conversion = { ok: true; rate: number; base: string } | { ok: false; error: string };

/** Rate to turn an amount in `currency` into the signed-in user's main currency. */
export async function conversionFor(currency: string): Promise<Conversion> {
  let base: string | null = null;
  try {
    base = (await getProfile())?.currency ?? null;
  } catch {
    return { ok: false, error: "Couldn't load your profile. Please try again." };
  }
  if (!base) return { ok: false, error: "Choose your main currency first." };

  const rate = await getRate(currency, base);
  if (rate === null) {
    return {
      ok: false,
      error: `Couldn't get today's ${currency} → ${base} exchange rate. Please try again in a moment.`,
    };
  }
  return { ok: true, rate, base };
}
