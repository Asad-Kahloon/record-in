"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { friendlyAuthError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import {
  emailSchema,
  fieldErrors,
  formString,
  newPasswordInput,
  safeNextPath,
  signInInput,
  signUpInput,
} from "@/lib/validation";

async function siteUrl() {
  if (env.appUrl) return env.appUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formString(formData, "email");
  const parsed = signInInput.safeParse({ email, password: formString(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error), values: { email } };

  revalidatePath("/", "layout");
  redirect(safeNextPath(formString(formData, "next")));
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { fullName: formString(formData, "fullName"), email: formString(formData, "email") };
  const parsed = signUpInput.safeParse({
    ...values,
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Only the display name goes into metadata. The role is decided by the database.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { error: friendlyAuthError(error), values };

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    success: `We sent a confirmation link to ${parsed.data.email}. Open it on this device to activate your account.`,
  };
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = safeNextPath(formString(formData, "next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data?.url) {
    redirect(`/auth/error?reason=${encodeURIComponent("Google sign-in isn't available right now.")}`);
  }
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formString(formData, "email");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0]?.message }, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });

  // Same answer whether or not the account exists, so emails can't be probed.
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { error: friendlyAuthError(error), values: { email } };
  }
  return { success: "If an account exists for that email, a reset link is on its way. Open it on this device." };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordInput.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "Your session has expired. Please request a new reset link." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error) };

  if (formString(formData, "then") === "dashboard") redirect("/dashboard");
  return { success: "Your password has been updated." };
}
