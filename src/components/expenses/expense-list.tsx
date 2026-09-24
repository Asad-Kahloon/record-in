"use client";

import { ListFilterIcon, PlusIcon, ReceiptTextIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ExpenseRow } from "@/components/expenses/expense-row";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { ItemGroup } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDayHeading } from "@/lib/dates";
import type { Expense } from "@/lib/types";

interface DayGroup {
  date: string;
  total: number;
  items: Expense[];
}

export function ExpenseList({
  expenses,
  today,
  readOnly = false,
}: {
  expenses: Expense[];
  today: string;
  readOnly?: boolean;
}) {
  const { locale } = useAppConfig();
  const money = useMoney();
  const { openExpense, addExpense } = useEntrySheets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const names = new Map<string, string>();
    expenses.forEach((e) => names.set(e.category, e.category_name));
    return [...names].sort((a, b) => a[1].localeCompare(b[1]));
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (!q || e.description.toLowerCase().includes(q) || e.category_name.toLowerCase().includes(q)),
    );
  }, [expenses, query, category]);

  // Rows arrive sorted by date (newest first), so grouping is a single pass.
  const groups = useMemo(() => {
    const out: DayGroup[] = [];
    for (const expense of filtered) {
      const last = out.at(-1);
      if (last && last.date === expense.spent_on) {
        last.items.push(expense);
        last.total += expense.base_amount;
      } else {
        out.push({ date: expense.spent_on, total: expense.base_amount, items: [expense] });
      }
    }
    return out;
  }, [filtered]);

  if (expenses.length === 0) {
    return (
      <Empty className="border bg-card/50 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-expense/15 text-expense">
            <ReceiptTextIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-base">No expenses this month</EmptyTitle>
          <EmptyDescription>
            {readOnly ? "Nothing has been logged for this month." : "Every rupee counts — add what you spend as you go."}
          </EmptyDescription>
        </EmptyHeader>
        {readOnly ? null : (
          <EmptyContent>
            <Button onClick={addExpense}>
              <PlusIcon />
              Add expense
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  const filtering = query.trim() !== "" || category !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputGroup className="h-10 rounded-xl sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search expenses"
            aria-label="Search expenses"
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
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-56" aria-label="Filter by category">
            <ListFilterIcon className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(([slug, name]) => (
              <SelectItem key={slug} value={slug}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtering ? (
          <p className="money text-sm text-muted-foreground sm:ml-auto">
            {filtered.length} shown · {money(filtered.reduce((sum, e) => sum + e.base_amount, 0))}
          </p>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>Try a different search or category.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1 text-sm">
              <h2 className="font-medium">{formatDayHeading(group.date, today, locale)}</h2>
              <span className="money text-muted-foreground tabular-nums">{money(group.total)}</span>
            </div>
            <ItemGroup className="gap-0.5 rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10">
              {group.items.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  today={today}
                  readOnly={readOnly}
                  onOpen={readOnly ? undefined : openExpense}
                />
              ))}
            </ItemGroup>
          </section>
        ))
      )}
    </div>
  );
}
