"use server";

import { revalidatePath } from "next/cache";

import { conversionFor } from "@/lib/conversion";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  fieldErrors,
  goalInput,
  goalMissInput,
  goalSaveInput,
  goalStatusInput,
  goalUpdateInput,
  goalWithdrawInput,
  idSchema,
} from "@/lib/validation";

export interface GoalFormValues {
  name: string;
  amount: string;
  currency: string;
  cadence: string;
  targetOn: string;
  note: string;
}

const INVALID = "Please fix the highlighted fields.";

export async function addGoalAction(input: GoalFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = goalInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_goal", {
    p_name: parsed.data.name,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_cadence: parsed.data.cadence,
    p_target_on: parsed.data.targetOn,
    p_note: parsed.data.note || null,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id }, message: "Aim created" };
}

export async function updateGoalAction(input: GoalFormValues & { id: string }): Promise<ActionResult> {
  const parsed = goalUpdateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const conversion = await conversionFor(parsed.data.currency);
  if (!conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_goal", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_cadence: parsed.data.cadence,
    p_target_on: parsed.data.targetOn,
    p_note: parsed.data.note || null,
    p_rate: conversion.rate,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Aim saved" };
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid aim." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_goal", { p_id: parsed.data });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Aim removed" };
}

/** Sets money aside. An empty amount means "this period's instalment". */
export async function saveToGoalAction(input: {
  id: string;
  amount?: string;
  currency?: string;
  savedOn?: string;
  note?: string;
}): Promise<ActionResult<{ achieved: boolean; saved: number }>> {
  const parsed = goalSaveInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const custom = parsed.data.amount !== "" && parsed.data.currency !== "";
  const conversion = custom ? await conversionFor(parsed.data.currency as string) : null;
  if (conversion && !conversion.ok) return { ok: false, error: conversion.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_to_goal", {
    p_id: parsed.data.id,
    p_amount: parsed.data.amount === "" ? null : parsed.data.amount,
    p_currency: custom ? parsed.data.currency : null,
    p_rate: conversion && conversion.ok ? conversion.rate : 1,
    p_saved_on: parsed.data.savedOn || null,
    p_note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  const achieved = data?.status === "achieved";
  return {
    ok: true,
    data: { achieved, saved: Number(data?.plan?.saved ?? 0) },
    message: achieved ? "Aim reached 🎉" : "Money set aside",
  };
}

/** Takes money back out of an aim; an empty amount takes all of it. */
export async function withdrawFromGoalAction(input: { id: string; amount?: string; note?: string }): Promise<ActionResult> {
  const parsed = goalWithdrawInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_from_goal", {
    p_id: parsed.data.id,
    p_amount: parsed.data.amount === "" ? null : parsed.data.amount,
    p_note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Back in your balance" };
}

export async function setGoalStatusAction(input: { id: string; status: string }): Promise<ActionResult> {
  const parsed = goalStatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_goal_status", { p_id: parsed.data.id, p_status: parsed.data.status });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  const message = {
    active: "Aim resumed",
    paused: "Aim paused",
    achieved: "Marked as reached",
    cancelled: "Aim cancelled — your money is back in your balance",
  }[parsed.data.status];
  return { ok: true, data: null, message };
}

/** Answers a missed period: add time, or keep the date and save more. */
export async function resolveGoalMissAction(input: {
  id: string;
  action: "extend" | "keep";
  periods?: number;
}): Promise<ActionResult> {
  const parsed = goalMissInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose how to catch up." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_goal_miss", {
    p_id: parsed.data.id,
    p_action: parsed.data.action,
    p_periods: parsed.data.periods,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: null,
    message: parsed.data.action === "extend" ? "More time added" : "Instalment updated",
  };
}
