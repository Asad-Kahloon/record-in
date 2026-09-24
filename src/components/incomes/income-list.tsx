"use client";

import { BanknoteArrowUpIcon, PlusIcon, WalletIcon } from "lucide-react";

import { EditableBadge } from "@/components/editable-badge";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatDateTime, formatMonth } from "@/lib/dates";
import type { Income } from "@/lib/types";

export function IncomeList({
  incomes,
  month,
  readOnly = false,
}: {
  incomes: Income[];
  month: string;
  readOnly?: boolean;
}) {
  const money = useMoney();
  const { locale, timeZone, currency } = useAppConfig();
  const { openIncome, addIncome } = useEntrySheets();

  if (incomes.length === 0) {
    return (
      <Empty className="border bg-card/50 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-income/15 text-income">
            <WalletIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-base">No income for {formatMonth(month, locale)}</EmptyTitle>
          <EmptyDescription>
            {readOnly
              ? "Nothing has been recorded for this month."
              : "Add your salary or any other money that came in, so reports can show what's left."}
          </EmptyDescription>
        </EmptyHeader>
        {readOnly ? null : (
          <EmptyContent>
            <Button onClick={() => addIncome(month)}>
              <PlusIcon />
              Add income
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <ItemGroup className="gap-0.5 rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10">
      {incomes.map((income) => {
        const content = (
          <>
            <ItemMedia>
              <span className="flex size-10 items-center justify-center rounded-xl bg-income/15 text-income">
                <BanknoteArrowUpIcon className="size-5" />
              </span>
            </ItemMedia>
            <ItemContent className="min-w-0 gap-0.5">
              <ItemTitle className="w-full truncate">{income.source}</ItemTitle>
              <ItemDescription className="truncate text-xs">
                {income.note || `Added ${formatDateTime(income.created_at, locale, timeZone)}`}
              </ItemDescription>
            </ItemContent>
            <ItemActions className="flex-col items-end gap-1">
              <span className="money font-semibold tabular-nums">{money(income.base_amount)}</span>
              {income.currency !== currency ? (
                <span className="money text-[11px] text-muted-foreground tabular-nums">
                  {money(income.amount, { currency: income.currency })}
                </span>
              ) : null}
              {readOnly ? null : <EditableBadge editableUntil={income.editable_until} canEdit={income.can_edit} />}
            </ItemActions>
          </>
        );

        return readOnly ? (
          <Item key={income.id} className="flex-nowrap rounded-xl px-2.5">
            {content}
          </Item>
        ) : (
          <Item key={income.id} asChild className="flex-nowrap rounded-xl px-2.5 text-left hover:bg-muted/60 active:bg-muted">
            <button type="button" onClick={() => openIncome(income)}>
              {content}
            </button>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
