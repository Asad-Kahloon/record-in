import { ArrowDownLeftIcon, ArrowUpRightIcon, CircleAlertIcon, ScaleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppConfig } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import type { DebtSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DebtSummaryCards({ summary, config }: { summary: DebtSummary; config: AppConfig }) {
  const money = (n: number) => formatMoney(n, config);
  const net = summary.lent_pending - summary.borrowed_pending;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Card className="relative overflow-hidden bg-linear-to-br from-income/12 via-card to-card">
          <CardHeader className="gap-1.5">
            <CardDescription className="flex items-center gap-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-income/15 text-income">
                <ArrowDownLeftIcon className="size-3.5" />
              </span>
              You owe
            </CardDescription>
            <CardTitle className="money truncate text-xl font-semibold tracking-tight sm:text-3xl">
              {money(summary.borrowed_pending)}
            </CardTitle>
            <p className="money truncate text-xs text-muted-foreground">
              {summary.borrowed_pending_count} pending · {money(summary.borrowed_settled)} paid back
            </p>
          </CardHeader>
        </Card>
        <Card className="relative overflow-hidden bg-linear-to-br from-expense/12 via-card to-card">
          <CardHeader className="gap-1.5">
            <CardDescription className="flex items-center gap-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-expense/15 text-expense">
                <ArrowUpRightIcon className="size-3.5" />
              </span>
              Owed to you
            </CardDescription>
            <CardTitle className="money truncate text-xl font-semibold tracking-tight sm:text-3xl">
              {money(summary.lent_pending)}
            </CardTitle>
            <p className="money truncate text-xs text-muted-foreground">
              {summary.lent_pending_count} pending · {money(summary.lent_settled)} received
            </p>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-sm ring-1 ring-foreground/5">
        <span className="flex items-center gap-2 text-muted-foreground">
          <ScaleIcon className="size-4" />
          Net position
        </span>
        <span className={cn("money font-semibold tabular-nums")}>
          {net === 0 ? "All even" : net > 0 ? `+${money(net)} owed to you` : `${money(-net)} you owe`}
        </span>
      </div>

      {summary.overdue_count > 0 ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            {summary.overdue_count} {summary.overdue_count === 1 ? "entry is" : "entries are"} past the return date
          </AlertTitle>
          <AlertDescription>Open an entry to record money as it comes back — all of it, or a part.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
