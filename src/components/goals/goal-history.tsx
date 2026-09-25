"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import type { GoalSaving } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GoalHistory({ savings }: { savings: GoalSaving[] }) {
  const { locale, currency } = useAppConfig();
  const money = useMoney();

  if (savings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Wallet history</CardTitle>
        <CardDescription>Every movement in and out of your aims.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        {savings.map((row) => {
          const isIn = row.direction === "in";
          return (
            <div key={row.id} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  isIn ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground",
                )}
              >
                {isIn ? <ArrowUpRightIcon className="size-4" /> : <ArrowDownLeftIcon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.goal_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(row.saved_on, locale, { day: "numeric", month: "short", year: "numeric" })}
                  {row.note ? ` · ${row.note}` : isIn ? " · set aside" : " · taken back"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("money text-sm font-semibold", isIn ? "text-foreground" : "text-muted-foreground")}>
                  {isIn ? "+" : "−"}
                  {money(row.base_amount)}
                </p>
                {row.currency !== currency ? (
                  <p className="money text-xs text-muted-foreground">
                    {money(row.amount, { currency: row.currency })}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
