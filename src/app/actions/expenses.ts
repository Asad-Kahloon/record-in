"use server";

import { revalidatePath } from "next/cache";

import { conversionFor } from "@/lib/conversion";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { expenseInput, expenseUpdateInput, fieldErrors, idSchema } from "@/lib/validation";

export interface ExpenseFormValues {
  amount: string;
  category: string;
  description: string;
  spentOn: string;
  paymentMethod: string;
  currency: string;
}

const INVALID = "Please fix the highlighted fields.";

export async function addExpenseAction(
  input: ExpenseFormValues,
): Promise<ActionResult<{ id: string; editableUntil: string }>> {
  const parsed = expenseInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  // The exchange rate is always looked up here on the server, never taken from the browser.
  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_expense", {
    p_amount: parsed.data.amount,
    p_category: parsed.data.category,
    p_description: parsed.data.description,
    p_spent_on: parsed.data.spentOn,
    p_payment_method: parsed.data.paymentMethod,
    p_currency: parsed.data.currency,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id, editableUntil: data.editable_until } };
}

export async function updateExpenseAction(input: ExpenseFormValues & { id: string }): Promise<ActionResult> {
  const parsed = expenseUpdateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_expense", {
    p_id: parsed.data.id,
    p_amount: parsed.data.amount,
    p_category: parsed.data.category,
    p_description: parsed.data.description,
    p_spent_on: parsed.data.spentOn,
    p_payment_method: parsed.data.paymentMethod,
    p_currency: parsed.data.currency,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Expense updated" };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid expense." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_expense", { p_id: parsed.data });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Expense deleted" };
}
