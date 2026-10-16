import { NextResponse, type NextRequest } from "next/server";

import { DataError } from "@/lib/data";
import { isMonthKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { buildReportData, ReportError } from "@/lib/reports/data";
import { renderReportPdf } from "@/lib/reports/pdf";
import { isReportFormat, resolveSections, type ReportScope } from "@/lib/reports/sections";
import { renderReportXlsx } from "@/lib/reports/xlsx";
import { idSchema } from "@/lib/validation";

// PDF and spreadsheet rendering need Node.js APIs.
export const runtime = "nodejs";

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

const TYPES = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/**
 * GET /api/report?format=pdf|xlsx&scope=me|user|all&user=<uuid>&month=YYYY-MM&sections=a,b,c
 * Required sections are always included. Authorization is enforced by the
 * database functions the report reads from.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format");
  const scope = (params.get("scope") ?? "me") as ReportScope;
  const month = params.get("month");
  const userId = params.get("user");

  if (!isReportFormat(format)) return plain("Choose PDF or Excel.", 400);
  if (scope !== "me" && scope !== "user" && scope !== "all") return plain("Invalid report scope.", 400);
  if (month && !isMonthKey(month)) return plain("Invalid month.", 400);
  if (scope === "user" && !idSchema.safeParse(userId).success) return plain("Invalid account.", 400);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return plain("Please sign in.", 401);

  const sections = resolveSections(params.get("sections"), { monthly: Boolean(month), scope });

  try {
    const data = await buildReportData({ scope, userId, month, sections });
    const body = format === "pdf" ? await renderReportPdf(data) : await renderReportXlsx(data);
    const filename = `RecordIn_${slug(scope === "all" ? "all-accounts" : data.who)}_${data.periodSlug}.${format}`;

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": TYPES[format],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReportError) return plain(error.message, error.status);
    if (error instanceof DataError) return plain(error.message, error.code === "42501" ? 403 : 400);
    console.error("[report]", error);
    return plain("Couldn't build the report. Please try again.", 500);
  }
}
