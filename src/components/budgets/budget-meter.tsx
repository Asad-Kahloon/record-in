"use client";

import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import { useAppConfig } from "@/components/providers/app-config";
import type { BudgetProgress, BudgetStatus } from "@/lib/budgets";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

// Status colors always travel with an icon and a label.
export const BUDGET_STATUS: Record<
  BudgetStatus,
  { label: string; icon: typeof CircleCheckIcon; fill: string; track: string; text: string }
> = {
  ok: { label: "On track", icon: CircleCheckIcon, fill: "bg-brand", track: "bg-brand/15", text: "text-positive" },
  close: { label: "Close to limit", icon: TriangleAlertIcon, fill: "bg-warning", track: "bg-warning/15", text: "text-warning" },
  over: { label: "Over budget", icon: CircleAlertIcon, fill: "bg-critical", track: "bg-critical/20", text: "text-destructive" },
};

export function BudgetMeter({
  progress,
  compact = false,
  className,
}: {
  progress: BudgetProgress;
  compact?: boolean;
  className?: string;
}) {
  const { locale } = useAppConfig();
  const status = BUDGET_STATUS[progress.status];
  const width = Math.min(100, Math.max(progress.spent > 0 ? 2 : 0, progress.ratio * 100));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="meter"
        aria-label={`${progress.name}: budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
        className={cn("overflow-hidden rounded-full", compact ? "h-1.5" : "h-2.5", status.track)}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", status.fill)} style={{ width: `${width}%` }} />
      </div>
      {compact ? null : (
        <p className={cn("flex items-center gap-1.5 text-xs font-medium", status.text)}>
          <status.icon className="size-3.5" />
          {status.label}
          <span className="font-normal text-muted-foreground">· {formatPercent(progress.ratio, locale)} used</span>
        </p>
      )}
    </div>
  );
}
