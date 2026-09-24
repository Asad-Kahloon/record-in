"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartViewToggle, type ChartView } from "@/components/charts/chart-view-toggle";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { datesOfMonth, formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { DailyTotal } from "@/lib/types";

// One series → one color (spent), no legend: the title names it.
const chartConfig = {
  total: { label: "Spent", color: "var(--expense)" },
} satisfies ChartConfig;

const DAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: undefined };

export function DailySpendChart({
  month,
  daily,
  className,
}: {
  month: string;
  daily: DailyTotal[];
  className?: string;
}) {
  const { locale } = useAppConfig();
  const money = useMoney();
  const [view, setView] = useState<ChartView>("chart");

  const data = useMemo(() => {
    const byDate = new Map(daily.map((d) => [d.date, d]));
    return datesOfMonth(month).map((date, index) => ({
      date,
      day: index + 1,
      total: byDate.get(date)?.total ?? 0,
      count: byDate.get(date)?.count ?? 0,
    }));
  }, [daily, month]);

  const peak = daily.reduce<DailyTotal | null>((max, d) => (!max || d.total > max.total ? d : max), null);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Daily spending</CardTitle>
        <CardDescription className="money">
          {peak
            ? `Highest day: ${money(peak.total)} on ${formatDate(peak.date, locale, DAY_LABEL)}`
            : "No expenses logged this month yet"}
        </CardDescription>
        <CardAction>
          <ChartViewToggle value={view} onChange={setView} />
        </CardAction>
      </CardHeader>
      <CardContent className="money px-2 sm:px-4">
        {view === "chart" ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%" accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={Math.ceil(data.length / 6) - 1}
              />
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
                      const point = payload?.[0]?.payload as { date?: string } | undefined;
                      return point?.date ? formatDate(point.date, locale, DAY_LABEL) : "";
                    }}
                    formatter={(value, _name, item) => (
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-0.5 w-3 rounded-full bg-(--color-total)" />
                            Spent
                          </span>
                          <span className="font-semibold text-foreground">{money(Number(value))}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {(item.payload as { count: number }).count} expense
                          {(item.payload as { count: number }).count === 1 ? "" : "s"}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="max-h-60 overflow-y-auto px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Nothing logged yet
                    </TableCell>
                  </TableRow>
                ) : (
                  [...daily].reverse().map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{formatDate(d.date, locale, DAY_LABEL)}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{money(d.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
