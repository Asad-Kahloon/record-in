"use client";

import { ArrowLeftRightIcon, PlusIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { TransactionRow, transactionSubtitle } from "@/components/transactions/transaction-row";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { ItemGroup } from "@/components/ui/item";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDayHeading } from "@/lib/dates";
import { transactionTotals, type Transaction } from "@/lib/transactions";

type Filter = "all" | "in" | "out" | "debt";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in", label: "Money in" },
  { value: "out", label: "Money out" },
  { value: "debt", label: "Borrow & lend" },
];

export function TransactionFeed({
  transactions,
  today,
  readOnly = false,
}: {
  transactions: Transaction[];
  today: string;
  readOnly?: boolean;
}) {
  const money = useMoney();
  const { locale } = useAppConfig();
  const { openQuickAdd } = useEntrySheets();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = transactions.filter((tx) => {
      if (filter === "in" && tx.flow !== "in") return false;
      if (filter === "out" && tx.flow !== "out") return false;
      if (filter === "debt" && tx.kind !== "debt") return false;
      return !q || tx.title.toLowerCase().includes(q) || transactionSubtitle(tx).toLowerCase().includes(q);
    });
    const out: { date: string; items: Transaction[] }[] = [];
    for (const tx of visible) {
      const last = out.at(-1);
      if (last && last.date === tx.date) last.items.push(tx);
      else out.push({ date: tx.date, items: [tx] });
    }
    return out;
  }, [transactions, filter, query]);

  if (transactions.length === 0) {
    return (
      <Empty className="border bg-card/50 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl">
            <ArrowLeftRightIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-base">No transactions this month</EmptyTitle>
          <EmptyDescription>
            {readOnly ? "Nothing was recorded this month." : "Spending, income and borrow & lend all land here."}
          </EmptyDescription>
        </EmptyHeader>
        {readOnly ? null : (
          <EmptyContent>
            <Button onClick={openQuickAdd}>
              <PlusIcon />
              Add a transaction
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => value && setFilter(value as Filter)}
          spacing={1}
          className="no-scrollbar -mx-1 w-auto overflow-x-auto px-1"
          aria-label="Filter transactions"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem
              key={f.value}
              value={f.value}
              className="h-9 shrink-0 rounded-full border border-border px-4 data-[state=on]:border-brand/50 data-[state=on]:bg-brand/15"
            >
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <InputGroup className="h-10 rounded-xl lg:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search"
            aria-label="Search transactions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => setQuery("")} aria-label="Clear search">
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      {groups.length === 0 ? (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>Try another filter or search.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        groups.map((group) => {
          const { net } = transactionTotals(group.items);
          return (
            <section key={group.date} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1 text-sm">
                <h2 className="font-semibold">{formatDayHeading(group.date, today, locale)}</h2>
                <span className="money text-muted-foreground tabular-nums">
                  {net >= 0 ? "+" : "−"}
                  {money(Math.abs(net))}
                </span>
              </div>
              <ItemGroup className="gap-0.5 rounded-3xl bg-card p-1.5 ring-1 ring-foreground/10">
                {group.items.map((tx) => (
                  <TransactionRow key={tx.key} tx={tx} today={today} readOnly={readOnly} />
                ))}
              </ItemGroup>
            </section>
          );
        })
      )}
    </div>
  );
}
