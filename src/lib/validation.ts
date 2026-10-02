import { z } from "zod";

import { isSupportedCurrency } from "@/lib/currencies";
import { isDateString, isMonthKey } from "@/lib/dates";

export const PAYMENT_METHODS = ["cash", "card", "bank", "wallet", "other"] as const;

export const amountSchema = z
  .string({ error: "Enter an amount" })
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a valid amount (up to 2 decimals)")
  .transform(Number)
  .refine((value) => value > 0, "Amount must be greater than zero");

export const dateSchema = z.string({ error: "Choose a date" }).refine(isDateString, "Choose a valid date");

export const monthKeySchema = z.string({ error: "Choose a month" }).refine(isMonthKey, "Choose a valid month");

export const currencySchema = z.string({ error: "Choose a currency" }).refine(isSupportedCurrency, "Choose a supported currency");

export const expenseInput = z.object({
  amount: amountSchema,
  category: z
    .string({ error: "Choose a category" })
    .regex(/^[a-z_]{2,32}$/, "Choose a category"),
  description: z
    .string({ error: "Add a short description" })
    .trim()
    .min(1, "Add a short description")
    .max(120, "Keep it under 120 characters"),
  spentOn: dateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
  currency: currencySchema,
});

export const expenseUpdateInput = expenseInput.extend({ id: z.uuid("Invalid expense") });

export const incomeInput = z.object({
  month: monthKeySchema,
  amount: amountSchema,
  source: z
    .string({ error: "Where did it come from?" })
    .trim()
    .min(1, "Where did it come from? (e.g. Salary)")
    .max(60, "Keep it under 60 characters"),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional().default(""),
  currency: currencySchema,
});

export const incomeUpdateInput = incomeInput.extend({ id: z.uuid("Invalid income entry") });

export const DEBT_DIRECTIONS = ["borrowed", "lent"] as const;

const debtBase = z.object({
  direction: z.enum(DEBT_DIRECTIONS, { error: "Did you borrow or lend this money?" }),
  counterparty: z
    .string({ error: "Who is this with?" })
    .trim()
    .min(1, "Who is this with?")
    .max(80, "Keep it under 80 characters"),
  amount: amountSchema,
  currency: currencySchema,
  occurredOn: dateSchema,
  dueOn: z.union([z.literal(""), dateSchema]).optional().default(""),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional().default(""),
});

const dueAfterStart = (d: { occurredOn: string; dueOn: string }) => !d.dueOn || d.dueOn >= d.occurredOn;
const dueAfterStartError = { error: "The return date can't be before the loan date", path: ["dueOn"] };

export const debtInput = debtBase.refine(dueAfterStart, dueAfterStartError);
export const debtUpdateInput = debtBase.extend({ id: z.uuid("Invalid entry") }).refine(dueAfterStart, dueAfterStartError);

export const settleInput = z.object({
  id: z.uuid("Invalid entry"),
  settled: z.boolean(),
  settledOn: dateSchema.optional(),
});

export const debtPaymentInput = z.object({
  debtId: z.uuid("Invalid entry"),
  amount: amountSchema,
  currency: currencySchema,
  paidOn: dateSchema,
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional().default(""),
});

export const idSchema = z.uuid("Invalid id");

export const emailSchema = z
  .string({ error: "Enter your email" })
  .trim()
  .toLowerCase()
  .max(254, "That email is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string({ error: "Enter a password" })
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const fullNameSchema = z
  .string({ error: "Enter your name" })
  .trim()
  .min(2, "Enter your name (at least 2 characters)")
  .max(80, "Keep it under 80 characters");

export const signInInput = z.object({
  email: emailSchema,
  password: z.string({ error: "Enter your password" }).min(1, "Enter your password").max(72, "Password is too long"),
});

export const signUpInput = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const newPasswordInput = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

/** First error message per field, for inline form errors. */
export function fieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const GUEST_ROUTES = ["/login", "/signup", "/forgot-password", "/auth"];

/** Only allow same-site relative redirects (blocks open-redirect tricks). */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (GUEST_ROUTES.some((route) => value === route || value.startsWith(`${route}/`) || value.startsWith(`${route}?`))) {
    return fallback;
  }
  return value;
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export const budgetCategorySchema = z.union([z.null(), z.string().regex(/^[a-z_]{2,32}$/, "Choose a category")]);

export const budgetInput = z.object({
  category: budgetCategorySchema,
  amount: z
    .string({ error: "Enter an amount" })
    .trim()
    .regex(/^d{1,12}(.d{1,2})?$/, "Enter a valid amount (up to 2 decimals)")
    .transform(Number)
    .refine((value) => value > 0, "Budget must be greater than zero"),
});

export const GOAL_CADENCE_VALUES = ["daily", "weekly", "monthly", "yearly"] as const;

const goalBase = z.object({
  name: z
    .string({ error: "Give this aim a name" })
    .trim()
    .min(1, "Give this aim a name")
    .max(60, "Keep it under 60 characters"),
  amount: amountSchema,
  currency: currencySchema,
  cadence: z.enum(GOAL_CADENCE_VALUES, { error: "How often will you save?" }),
  targetOn: dateSchema,
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional().default(""),
});

export const goalInput = goalBase;
export const goalUpdateInput = goalBase.extend({ id: z.uuid("Invalid aim") });

/** An empty amount means "this period's instalment". */
export const goalSaveInput = z.object({
  id: z.uuid("Invalid aim"),
  amount: z.union([z.literal(""), amountSchema]).optional().default(""),
  currency: z.union([z.literal(""), currencySchema]).optional().default(""),
  savedOn: z.union([z.literal(""), dateSchema]).optional().default(""),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional().default(""),
});

/** An empty amount takes everything back out. */
export const goalWithdrawInput = z.object({
  id: z.uuid("Invalid aim"),
  amount: z.union([z.literal(""), amountSchema]).optional().default(""),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional().default(""),
});

export const goalStatusInput = z.object({
  id: z.uuid("Invalid aim"),
  status: z.enum(["active", "paused", "achieved", "cancelled"], { error: "Unknown status" }),
});

export const goalMissInput = z.object({
  id: z.uuid("Invalid aim"),
  action: z.enum(["extend", "keep"], { error: "Choose how to catch up" }),
  periods: z.number().int().min(1).max(120).optional().default(1),
});
