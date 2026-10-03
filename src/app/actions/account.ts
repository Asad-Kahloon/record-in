"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupportedCurrency } from "@/lib/currencies";
import { friendlyDbError } from "@/lib/errors";
import { getRate, getRatesInto } from "@/lib/rates";
import { createClient } from "@/lib/supabase/server";
import { isTheme } from "@/lib/theme";
import type { ActionResult, FormState, NotificationItem } from "@/lib/types";
import { formString, fullNameSchema, idSchema } from "@/lib/validation";

// ─── profile ─────────────────────────────────────────────────────────────────

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = formString(formData, "fullName");
  const parsed = fullNameSchema.safeParse(fullName);
  if (!parsed.success) return { fieldErrors: { fullName: parsed.error.issues[0]?.message }, values: { fullName } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_profile", { p_full_name: parsed.data });
  if (error) return { error: friendlyDbError(error), values: { fullName } };

  revalidatePath("/", "layout");
  return { success: "Profile updated.", values: { fullName: parsed.data } };
}

// ─── notifications ───────────────────────────────────────────────────────────

export async function getUnreadCountAction(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  return error ? 0 : Number(data) || 0;
}

export async function getLatestNotificationsAction(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_notifications", { p_limit: 6 });
  return error ? [] : ((data ?? []) as NotificationItem[]);
}

const idsSchema = z.array(idSchema).max(100).optional();

export async function markNotificationsReadAction(
  ids?: string[],
  options?: { silent?: boolean },
): Promise<ActionResult<number>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid notifications." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_notifications_read", { p_ids: parsed.data ?? null });
  if (error) return { ok: false, error: friendlyDbError(error) };

  // Silent: the caller keeps showing what was new on screen and updates the badge itself.
  if (!options?.silent) revalidatePath("/", "layout");
  return { ok: true, data: Number(data) || 0 };
}

// ─── super admin ─────────────────────────────────────────────────────────────

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  const parsed = z.object({ userId: idSchema, active: z.boolean() }).safeParse({ userId, active });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_active", {
    p_user_id: parsed.data.userId,
    p_active: parsed.data.active,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/admin");
  return { ok: true, data: null, message: parsed.data.active ? "Account activated" : "Account deactivated" };
}

// ─── currency ────────────────────────────────────────────────────────────────

/** Live preview rate for forms. Saving always re-checks the rate on the server. */
export async function getRateAction(from: string, to: string): Promise<number | null> {
  if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  return getRate(from, to);
}

/**
 * Sets or changes the main currency. Every entry is re-expressed in the new
 * currency with today's rates; the amounts people typed never change.
 */
export async function setCurrencyAction(
  currency: string,
  options?: { then?: "dashboard" },
): Promise<ActionResult> {
  if (!isSupportedCurrency(currency)) return { ok: false, error: "Choose a supported currency." };

  const rates = await getRatesInto(currency);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_currency", { p_currency: currency, p_rates: rates ?? {} });
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/", "layout");
  if (options?.then === "dashboard") redirect("/dashboard");
  return { ok: true, data: null, message: `Main currency is now ${currency}` };
}

// ─── theme ───────────────────────────────────────────────────────────────────

/**
 * Saves light or dark on the account. The screen has already switched and the
 * browser has set this device's cookie, so nothing here re-renders the page.
 */
export async function setThemeAction(theme: string): Promise<ActionResult> {
  if (!isTheme(theme)) return { ok: false, error: "Choose light or dark." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_theme", { p_theme: theme });
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't save your theme. Please try again.") };

  return { ok: true, data: null };
}

// ─── onboarding ──────────────────────────────────────────────────────────────

/** First sign-in: saves the chosen theme, then the main currency, then lands on Home. */
export async function completeWelcomeAction(currency: string, theme: string): Promise<ActionResult> {
  if (!isTheme(theme)) return { ok: false, error: "Choose light or dark." };
  if (!isSupportedCurrency(currency)) return { ok: false, error: "Choose a supported currency." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_theme", { p_theme: theme });
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't save your theme. Please try again.") };

  return setCurrencyAction(currency, { then: "dashboard" });
}

/** Marks the welcome tour as seen, so it doesn't auto-start again on any device. */
export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding");
  if (error) return { ok: false, error: friendlyDbError(error) };
  return { ok: true, data: null };
}
