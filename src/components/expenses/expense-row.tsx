"use client";

import { EditableBadge } from "@/components/editable-badge";
import { useAppConfig, useMoney } from "@/components/providers/app-config";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { categoryIcon, paymentMethodLabel } from "@/lib/categories";
import { formatDayHeading } from "@/lib/dates";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExpenseRow({
  expense,
  today,
  showDate = false,
  readOnly = false,
  onOpen,
}: {
  expense: Expense;
  today: string;
  showDate?: boolean;
  readOnly?: boolean;
  onOpen?: (expense: Expense) => void;
}) {
  const money = useMoney();
  const { locale, currency } = useAppConfig();
  const Icon = categoryIcon(expense.category);

  const meta = [
    expense.category_name,
    showDate ? formatDayHeading(expense.spent_on, today, locale) : paymentMethodLabel(expense.payment_method),
  ].join(" · ");

  const content = (
    <>
      <ItemMedia>
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5 text-foreground/80" />
        </span>
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="w-full truncate">{expense.description}</ItemTitle>
        <ItemDescription className="truncate text-xs">{meta}</ItemDescription>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-1">
        <span className="money font-semibold tabular-nums">{money(expense.base_amount)}</span>
        {expense.currency !== currency ? (
          <span className="money text-[11px] text-muted-foreground tabular-nums">
            {money(expense.amount, { currency: expense.currency })}
          </span>
        ) : null}
        {readOnly ? null : <EditableBadge editableUntil={expense.editable_until} canEdit={expense.can_edit} />}
      </ItemActions>
    </>
  );

  if (readOnly || !onOpen) {
    return <Item className="flex-nowrap rounded-xl px-2.5">{content}</Item>;
  }

  return (
    <Item asChild className={cn("flex-nowrap rounded-xl px-2.5 text-left hover:bg-muted/60 active:bg-muted")}>
      <button type="button" onClick={() => onOpen(expense)}>
        {content}
      </button>
    </Item>
  );
}
