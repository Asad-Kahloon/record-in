"use client";

import { ArrowRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { useEntrySheets } from "@/components/providers/entry-sheets";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemGroup } from "@/components/ui/item";
import type { Transaction } from "@/lib/transactions";

export function RecentTransactions({
  transactions,
  today,
  href,
  className,
}: {
  transactions: Transaction[];
  today: string;
  href: string;
  className?: string;
}) {
  const { openQuickAdd } = useEntrySheets();

  return (
    <Card data-tour="transactions" className={className}>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Latest money in and out</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              See all
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-1.5">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Nothing yet this month. Your first transaction will show up here.</p>
            <Button onClick={openQuickAdd}>
              <PlusIcon />
              Add a transaction
            </Button>
          </div>
        ) : (
          <ItemGroup className="gap-0.5">
            {transactions.map((tx) => (
              <TransactionRow key={tx.key} tx={tx} today={today} showDate />
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
