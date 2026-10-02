import { NextResponse, type NextRequest } from "next/server";

import { isMonthKey } from "@/lib/dates";
import { env } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

interface ExportRow {
  kind: "expense" | "income" | "borrowed" | "lent" | "paid_back" | "received_back" | "saving" | "saving_returned";
  user_name: string;
  user_email: string;
  entry_date: string;
  category: string;
  description: string;
  payment_method: string | null;
  status: string | null;
  amount: number | string;
  currency: string;
  rate: number | string;
  base_amount: number | string;
  base_currency: string | null;
  created_at: string;
}

// Spreadsheet apps execute cells starting with these characters as formulas.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: string) {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function plain(message: string, status: number) {
  return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "account"
  );
}

function localTimestamp(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: env.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/**
 * GET /api/export?scope=me|user|all&user=<uuid>&month=YYYY-MM
 * Authorization is enforced by the export_transactions() database function.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scope = params.get("scope") ?? "me";
  const month = params.get("month");
  const userId = params.get("user");

  if (scope !== "me" && scope !== "user" && scope !== "all") return plain("Invalid export scope.", 400);
  if (month && !isMonthKey(month)) return plain("Invalid month.", 400);
  if (scope === "user" && !idSchema.safeParse(userId).success) return plain("Invalid account.", 400);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return plain("Please sign in.", 401);

  const { data, error } = await supabase.rpc("export_transactions", {
    p_user_id: scope === "user" ? userId : null,
    p_month: month ? `${month}-01` : null,
    p_all_users: scope === "all",
  });
  if (error) return plain(friendlyDbError(error), error.code === "42501" ? 403 : 400);

  const rows = (data ?? []) as ExportRow[];
  const header = [
    "Type",
    "Account",
    "Email",
    "Date",
    "Category / Source / Person",
    "Description / Note",
    "Payment method",
    "Status",
    "Amount",
    "Currency",
    "Exchange rate",
    "Amount in main currency",
    "Main currency",
    `Recorded at (${env.timeZone})`,
  ];
  const lines = [
    header,
    ...rows.map((r) => [
      r.kind,
      r.user_name,
      r.user_email,
      r.entry_date,
      r.category,
      r.description,
      r.payment_method ?? "",
      r.status ?? "",
      Number(r.amount).toFixed(2),
      r.currency,
      String(Number(r.rate)),
      Number(r.base_amount).toFixed(2),
      r.base_currency ?? "",
      localTimestamp(r.created_at),
    ]),
  ].map((cols) => cols.map((c) => csvCell(String(c ?? ""))).join(","));

  const who = scope === "all" ? "all-accounts" : slug(rows[0]?.user_name ?? "account");
  const filename = `expenses_${who}_${month ?? "all-time"}.csv`;

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
