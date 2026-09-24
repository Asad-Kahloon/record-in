"use client";

import { ChartPieIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { categoryIcon } from "@/lib/categories";
import { formatPercent } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Ranked bars for spending by category. Categories are nominal, so every bar
 * uses the same "spent" hue; the icon + name carry identity and the value and
 * share are always printed (no hover needed).
 */
export function CategoryBreakdown({
  categories,
  total,
  title = "Where it went",
  description,
  limit = 6,
  className,
}: {
  categories: CategoryTotal[];
  total: number;
  title?: string;
  description?: string;
  limit?: number;
  className?: string;
}) {
  const money = useMoney();
  const { locale } = useAppConfig();
  const [expanded, setExpanded] = useState(false);

  const max = categories[0]?.total ?? 0;
  const visible = expanded ? categories : categories.slice(0, limit);
  const hiddenCount = categories.length - visible.length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description ?? (categories.length ? `${categories.length} categories this period` : "Spending by category")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {categories.length === 0 ? (
          <Empty className="flex-1 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartPieIcon />
              </EmptyMedia>
              <EmptyTitle>No spending yet</EmptyTitle>
              <EmptyDescription>Categories appear here once you add expenses.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {visible.map((c) => {
                const Icon = categoryIcon(c.category);
                return (
                  <li key={c.category} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className="size-4.5 text-foreground/80" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="money shrink-0 font-medium tabular-nums">{money(c.total)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-expense/15">
                          <div
                            className="h-full rounded-full bg-expense"
                            style={{ width: `${max ? Math.max(2, (c.total / max) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                          {formatPercent(total ? c.total / total : 0, locale)} · {c.count}×
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {categories.length > limit ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 self-start text-muted-foreground"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Show top categories" : `Show ${hiddenCount} more`}
                <ChevronDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
