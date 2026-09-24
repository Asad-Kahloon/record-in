"use client";

import { ChevronDownIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, POPULAR_CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";

const popular = CURRENCIES.filter((c) => POPULAR_CURRENCIES.includes(c.code));
const others = CURRENCIES.filter((c) => !POPULAR_CURRENCIES.includes(c.code));

function Items({ list }: { list: typeof CURRENCIES }) {
  return list.map((c) => (
    <SelectItem key={c.code} value={c.code}>
      <span className="w-10 font-semibold tabular-nums">{c.code}</span>
      <span className="text-muted-foreground">{c.name}</span>
    </SelectItem>
  ));
}

export function CurrencySelect({
  value,
  onValueChange,
  disabled,
  compact = false,
  id,
  ariaLabel = "Currency",
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  /** Small code-only pill, used inside amount inputs. */
  compact?: boolean;
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          compact
            ? "h-9 gap-1 rounded-xl border-0 bg-muted px-3 font-semibold hover:bg-accent dark:bg-muted [&>svg:last-child]:hidden"
            : "h-11 w-full rounded-xl",
          className,
        )}
      >
        {compact ? (
          <>
            <span className="tabular-nums">{value}</span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="max-h-80">
        <SelectGroup>
          <SelectLabel>Popular</SelectLabel>
          <Items list={popular} />
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>More currencies</SelectLabel>
          <Items list={others} />
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
