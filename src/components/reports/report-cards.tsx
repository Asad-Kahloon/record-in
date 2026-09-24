import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paymentMethodIcon, paymentMethodLabel } from "@/lib/categories";
import type { AppConfig } from "@/lib/env";
import { formatMoney, formatPercent } from "@/lib/format";
import type { MethodTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Highlight {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}

export function HighlightsCard({
  title = "Highlights",
  description,
  items,
  className,
}: {
  title?: string;
  description?: string;
  items: Highlight[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
                <item.icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="truncate font-semibold">{item.value}</p>
                {item.hint ? <p className="truncate text-xs text-muted-foreground">{item.hint}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PaymentMethodsCard({
  methods,
  total,
  config,
  className,
}: {
  methods: MethodTotal[];
  total: number;
  config: AppConfig;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>How you paid</CardTitle>
        <CardDescription>Spending by payment method</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  No expenses yet
                </TableCell>
              </TableRow>
            ) : (
              methods.map((m) => {
                const Icon = paymentMethodIcon(m.method);
                return (
                  <TableRow key={m.method}>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="size-4 text-muted-foreground" />
                        {paymentMethodLabel(m.method)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.count}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatPercent(total ? m.total / total : 0, config.locale)}
                    </TableCell>
                    <TableCell className={cn("money text-right font-medium tabular-nums")}>
                      {formatMoney(m.total, config)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
