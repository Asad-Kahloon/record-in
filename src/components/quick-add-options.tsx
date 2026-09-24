"use client";

import { ArrowDownToLineIcon, ArrowUpFromLineIcon, ChevronRightIcon, HandCoinsIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type QuickAddKind = "expense" | "income" | "debt";

const OPTIONS: { kind: QuickAddKind; title: string; body: string; icon: typeof HandCoinsIcon; tone: string }[] = [
  { kind: "expense", title: "Expense", body: "Money you spent", icon: ArrowUpFromLineIcon, tone: "bg-expense/15 text-expense" },
  { kind: "income", title: "Income", body: "Money you received", icon: ArrowDownToLineIcon, tone: "bg-income/15 text-income" },
  { kind: "debt", title: "Borrow or lend", body: "Money you owe or are owed", icon: HandCoinsIcon, tone: "bg-brand/15 text-brand" },
];

export function QuickAddOptions({ onPick }: { onPick: (kind: QuickAddKind) => void }) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      {OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          onClick={() => onPick(option.kind)}
          className="flex items-center gap-4 rounded-2xl bg-muted/40 p-4 text-left ring-1 ring-foreground/5 transition hover:bg-muted active:scale-[0.99]"
        >
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", option.tone)}>
            <option.icon className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{option.title}</span>
            <span className="block text-sm text-muted-foreground">{option.body}</span>
          </span>
          <ChevronRightIcon className="size-5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
