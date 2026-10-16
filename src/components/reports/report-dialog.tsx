"use client";

import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon, LockIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppConfig } from "@/components/providers/app-config";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatMonth } from "@/lib/dates";
import {
  isReportFormat,
  REPORT_SECTIONS,
  type ReportFormat,
  type ReportScope,
  type ReportSection,
} from "@/lib/reports/sections";
import { cn } from "@/lib/utils";

type Period = "month" | "all";

export interface ReportTarget {
  /** Whose report: your own (default), one account (super admin), or everyone. */
  scope?: ReportScope;
  userId?: string;
  /** The month on screen ("YYYY-MM"), offered as the monthly period. */
  month: string;
  defaultPeriod?: Period;
}

const FORMATS: { value: ReportFormat; label: string; hint: string; icon: typeof FileTextIcon }[] = [
  { value: "pdf", label: "PDF", hint: "Ready to share or print", icon: FileTextIcon },
  { value: "xlsx", label: "Excel", hint: "Sort, filter and add up", icon: FileSpreadsheetIcon },
];

/** Why a section can't go in this report, or null if it can. */
function unavailable(section: ReportSection, period: Period, scope: ReportScope): string | null {
  if (section.singleAccount && scope === "all") return "Not in the everyone report — each account has its own currency";
  if (section.monthOnly && period === "all") return "Monthly reports only";
  return null;
}

/** "PDF or Excel, and what goes in it" — then the download starts. */
export function ReportSheet({
  open,
  onOpenChange,
  scope = "me",
  userId,
  month,
  defaultPeriod = "month",
}: ReportTarget & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { locale } = useAppConfig();
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  // Every optional part starts ticked; untick what you don't need.
  const [picked, setPicked] = useState<Set<string>>(() => new Set(REPORT_SECTIONS.map((s) => s.key)));

  const included = REPORT_SECTIONS.filter(
    (s: ReportSection) => s.required || (!unavailable(s, period, scope) && picked.has(s.key)),
  );
  const query = new URLSearchParams({ format, scope });
  if (scope === "user" && userId) query.set("user", userId);
  if (period === "month") query.set("month", month);
  query.set("sections", included.map((s) => s.key).join(","));
  const href = `/api/report?${query.toString()}`;

  const toggle = (key: string, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Download a report"
      description="Choose a format and what goes in it."
    >
      <div className="flex flex-col gap-6 pb-4">
        <section className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Format</p>
          <ToggleGroup
            type="single"
            value={format}
            onValueChange={(value) => isReportFormat(value) && setFormat(value)}
            spacing={2}
            aria-label="Report format"
            className="grid w-full grid-cols-2 gap-2"
          >
            {FORMATS.map((f) => (
              <ToggleGroupItem
                key={f.value}
                value={f.value}
                className="h-auto min-w-0 flex-col items-start gap-1 rounded-2xl border border-transparent bg-muted/50 p-3 text-left hover:bg-muted data-[state=on]:border-brand/50 data-[state=on]:bg-brand/12"
              >
                <f.icon className={cn("size-5!", f.value === "pdf" ? "text-expense" : "text-income")} />
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="w-full truncate text-xs font-normal text-muted-foreground">{f.hint}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Period</p>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(value) => (value === "month" || value === "all") && setPeriod(value)}
            spacing={1}
            aria-label="Report period"
            className="w-full"
          >
            <ToggleGroupItem
              value="month"
              className="h-10 flex-1 rounded-full border border-border px-4 data-[state=on]:border-brand/50 data-[state=on]:bg-brand/15"
            >
              {formatMonth(month, locale)}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="all"
              className="h-10 flex-1 rounded-full border border-border px-4 data-[state=on]:border-brand/50 data-[state=on]:bg-brand/15"
            >
              All time
            </ToggleGroupItem>
          </ToggleGroup>
        </section>

        <section className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">What to include</p>
          <FieldGroup className="gap-2">
            {REPORT_SECTIONS.map((section: ReportSection) => {
              const reason = unavailable(section, period, scope);
              const locked = Boolean(section.required);
              const checked = locked || (!reason && picked.has(section.key));
              const id = `report-section-${section.key}`;
              return (
                <FieldLabel key={section.key} htmlFor={id} className={cn("rounded-xl", reason && "opacity-60")}>
                  <Field orientation="horizontal" data-disabled={locked || reason ? true : undefined} className="items-start">
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={locked || Boolean(reason)}
                      onCheckedChange={(value) => toggle(section.key, value === true)}
                      className="mt-0.5"
                    />
                    <FieldContent>
                      <FieldTitle className="flex flex-wrap items-center gap-2">
                        {section.label}
                        {locked ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <LockIcon className="size-3" />
                            Always included
                          </Badge>
                        ) : null}
                      </FieldTitle>
                      <FieldDescription className="text-xs">{reason ?? section.hint}</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              );
            })}
          </FieldGroup>
        </section>

        <Button asChild className="h-11 rounded-xl text-base">
          <a
            href={href}
            download
            onClick={() => {
              toast.success(`Preparing your ${format === "pdf" ? "PDF" : "Excel"} report — it downloads in a moment.`);
              setTimeout(() => onOpenChange(false), 0);
            }}
          >
            <DownloadIcon />
            Download {format === "pdf" ? "PDF" : "Excel"}
          </a>
        </Button>
      </div>
    </ResponsiveSheet>
  );
}

/** Button that opens the report sheet. */
export function ReportButton({
  label = "Download report",
  variant = "outline",
  className,
  ...target
}: ReportTarget & {
  label?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>
        <DownloadIcon />
        {label}
      </Button>
      <ReportSheet {...target} open={open} onOpenChange={setOpen} />
    </>
  );
}
