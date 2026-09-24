"use server";

import { revalidatePath } from "next/cache";

import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { budgetCategorySchema, budgetInput, fieldErrors } from "@/lib/validation";

/** Creates or updates the overall budget (category null) or a category budget. */
export async function setBudgetAction(input: { category: string | null; amount: string }): Promise<ActionResult> {
  const parsed = budgetInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_budget", {
    p_category: parsed.data.category,
    p_amount: parsed.data.amount,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Budget saved" };
}

export async function deleteBudgetAction(category: string | null): Promise<ActionResult> {
  const parsed = budgetCategorySchema.safeParse(category);
  if (!parsed.success) return { ok: false, error: "Invalid budget." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_budget", { p_category: parsed.data });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Budget removed" };
}
