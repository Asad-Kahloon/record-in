"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartViewToggle, type ChartView } from "@/components/charts/chart-view-toggle";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { MonthTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

// Two series from the validated palette: aqua (income) and orange (spent).
const chartConfig = {
  income: { label: "Income", color: "var(--income)" },
  expense: { label: "Spent", color: "var(--expense)" },
} satisfies ChartConfig;

export function IncomeExpenseChart({ months, className }: { months: MonthTotal[]; className?: string }) {
  const { locale } = useAppConfig();
  const money = useMoney();
  const [view, setView] = useState<ChartView>("chart");

  const data = useMemo(
    () =>
      months.map((m) => ({
        ...m,
        label: formatMonthShort(m.month, locale),
        saved: m.income - m.expense,
      })),
    [months, locale],
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Income vs spent</CardTitle>
        <CardDescription>Month by month</CardDescription>
        <CardAction>
          <ChartViewToggle value={view} onChange={setView} />
        </CardAction>
      </CardHeader>
      <CardContent className="money px-2 sm:px-4">
        {view === "chart" ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="30%" accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickCount={4}
                allowDecimals={false}
                tickFormatter={(value) => formatNumber(Number(value), locale, true)}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as { month?: string } | undefined;
                      return point?.month ? formatMonth(point.month, locale) : "";
                    }}
                    formatter={(value, name, item, index) => {
                      const key = String(name) as keyof typeof chartConfig;
                      const saved = (item.payload as { saved: number }).saved;
                      return (
                        <div className="flex w-full flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span
                                className={cn("h-0.5 w-3 rounded-full", key === "income" ? "bg-income" : "bg-expense")}
                              />
                              {chartConfig[key]?.label ?? name}
                            </span>
                            <span className="font-semibold text-foreground">{money(Number(value))}</span>
                          </div>
                          {index === 1 ? (
                            <div className="flex items-center justify-between gap-6 border-t pt-1.5">
                              <span className="text-muted-foreground">{saved >= 0 ? "Saved" : "Overspent"}</span>
                              <span className="font-semibold text-foreground">{money(Math.abs(saved))}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="max-h-72 overflow-y-auto px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data].reverse().map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{formatMonth(m.month, locale, "short")}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(m.income)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(m.expense)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", m.saved < 0 && "text-destructive")}>
                      {money(m.saved)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
