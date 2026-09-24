"use client";

import { ArrowDownLeftIcon, ArrowRightIcon, ArrowUpRightIcon, HandCoinsIcon } from "lucide-react";
import Link from "next/link";

import { useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DebtSummary } from "@/lib/types";

export function DebtsCard({ summary, className }: { summary: DebtSummary; className?: string }) {
  const money = useMoney();
  const { addDebt } = useEntrySheets();
  const nothingPending = !summary.borrowed_pending_count && !summary.lent_pending_count;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Borrow & lend</CardTitle>
        <CardDescription>
          {nothingPending
            ? "Nothing pending right now"
            : summary.overdue_count
              ? `${summary.overdue_count} past the return date`
              : "Pending balances"}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/debts">
              Open
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Link href="/debts" className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5 transition-colors hover:bg-muted/70">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowDownLeftIcon className="size-3.5 text-income" />
            You owe
          </p>
          <p className="money mt-1 truncate text-lg font-semibold">{money(summary.borrowed_pending)}</p>
          <p className="text-[11px] text-muted-foreground">{summary.borrowed_pending_count} pending</p>
        </Link>
        <Link href="/debts" className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5 transition-colors hover:bg-muted/70">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpRightIcon className="size-3.5 text-expense" />
            Owed to you
          </p>
          <p className="money mt-1 truncate text-lg font-semibold">{money(summary.lent_pending)}</p>
          <p className="text-[11px] text-muted-foreground">{summary.lent_pending_count} pending</p>
        </Link>
        {nothingPending ? (
          <Button variant="outline" className="col-span-2" onClick={() => addDebt()}>
            <HandCoinsIcon />
            Record borrow / lend
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
