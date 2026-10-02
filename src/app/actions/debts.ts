"use server";

import { revalidatePath } from "next/cache";

import { conversionFor } from "@/lib/conversion";
import { friendlyDbError } from "@/lib/errors";
import { getRate } from "@/lib/rates";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { debtInput, debtPaymentInput, debtUpdateInput, fieldErrors, idSchema, settleInput } from "@/lib/validation";

export interface DebtFormValues {
  direction: string;
  counterparty: string;
  amount: string;
  currency: string;
  occurredOn: string;
  dueOn: string;
  note: string;
}

const INVALID = "Please fix the highlighted fields.";

export async function addDebtAction(input: DebtFormValues): Promise<ActionResult<{ id: string; editableUntil: string }>> {
  const parsed = debtInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_debt", {
    p_direction: parsed.data.direction,
    p_counterparty: parsed.data.counterparty,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_occurred_on: parsed.data.occurredOn,
    p_due_on: parsed.data.dueOn || null,
    p_note: parsed.data.note || null,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id, editableUntil: data.editable_until } };
}

export async function updateDebtAction(input: DebtFormValues & { id: string }): Promise<ActionResult> {
  const parsed = debtUpdateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_debt", {
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
    p_counterparty: parsed.data.counterparty,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_occurred_on: parsed.data.occurredOn,
    p_due_on: parsed.data.dueOn || null,
    p_note: parsed.data.note || null,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Saved" };
}

export async function deleteDebtAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_debt", { p_id: parsed.data });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Deleted" };
}

export interface DebtPaymentValues {
  debtId: string;
  amount: string;
  currency: string;
  paidOn: string;
  note: string;
}

/** Money handed back on a debt — all of it or a part, in any currency. Works even after the edit window. */
export async function addDebtPaymentAction(
  input: DebtPaymentValues,
): Promise<ActionResult<{ paymentId: string; remaining: number; settled: boolean }>> {
  const parsed = debtPaymentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();

  // A repayment counts against the debt in the debt's own currency, so the
  // rate is looked up from the stored debt, never taken from the browser.
  const { data: debts, error: listError } = await supabase.rpc("list_debts", { p_user_id: null });
  if (listError) return { ok: false, error: friendlyDbError(listError) };
  const debt = (debts as { id: string; currency: string }[] | null)?.find((d) => d.id === parsed.data.debtId);
  if (!debt) return { ok: false, error: "That entry no longer exists." };

  const rate = await getRate(parsed.data.currency, debt.currency);
  if (rate === null) {
    return {
      ok: false,
      error: `Couldn't get today's ${parsed.data.currency} → ${debt.currency} exchange rate. Please try again in a moment.`,
    };
  }

  const { data, error } = await supabase.rpc("add_debt_payment", {
    p_debt_id: parsed.data.debtId,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_rate: rate,
    p_paid_on: parsed.data.paidOn,
    p_note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { paymentId: data.payment.id, remaining: Number(data.remaining), settled: Boolean(data.settled) },
  };
}

/** Undo a repayment recorded by mistake — only within its edit window. */
export async function deleteDebtPaymentAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_debt_payment", { p_id: parsed.data });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Repayment undone" };
}

/** Mark as paid back / received, or back to pending. Works even after the edit window. */
export async function setDebtSettledAction(id: string, settled: boolean, settledOn?: string): Promise<ActionResult> {
  const parsed = settleInput.safeParse({ id, settled, settledOn });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_debt_settled", {
    p_id: parsed.data.id,
    p_settled: parsed.data.settled,
    p_settled_on: parsed.data.settledOn ?? null,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: parsed.data.settled ? "Marked as settled" : "Marked as pending" };
}
