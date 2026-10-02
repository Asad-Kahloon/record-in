import type { Debt } from "@/lib/types";

/** Share of a debt handed back so far, 0–100. */
export function repaidPercent(debt: Debt): number {
  if (debt.settled_on) return 100;
  return debt.amount > 0 ? Math.min(100, Math.max(0, (debt.paid / debt.amount) * 100)) : 0;
}

/** Some money has come back, but not all of it. */
export function isPartPaid(debt: Debt): boolean {
  return !debt.settled_on && debt.paid > 0;
}
