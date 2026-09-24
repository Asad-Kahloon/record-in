"use server";

import { revalidatePath } from "next/cache";

import { conversionFor } from "@/lib/conversion";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { fieldErrors, idSchema, incomeInput, incomeUpdateInput } from "@/lib/validation";

export interface IncomeFormValues {
  month: string;
  amount: string;
  source: string;
  note: string;
  currency: string;
}

const INVALID = "Please fix the highlighted fields.";

export async function addIncomeAction(input: IncomeFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = incomeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_income", {
    p_month: `${parsed.data.month}-01`,
    p_amount: parsed.data.amount,
    p_source: parsed.data.source,
    p_currency: parsed.data.currency,
    p_note: parsed.data.note || null,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id }, message: "Income added" };
}

export async function updateIncomeAction(input: IncomeFormValues & { id: string }): Promise<ActionResult> {
  const parsed = incomeUpdateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_income", {
    p_id: parsed.data.id,
    p_month: `${parsed.data.month}-01`,
    p_amount: parsed.data.amount,
    p_source: parsed.data.source,
    p_currency: parsed.data.currency,
    p_note: parsed.data.note || null,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Income updated" };
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid income entry." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_income", { p_id: parsed.data });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Income deleted" };
}
