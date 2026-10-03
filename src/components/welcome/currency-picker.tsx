"use client";

import { ArrowRightIcon } from "lucide-react";

import { CurrencySelect } from "@/components/currency-select";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CURRENCIES, POPULAR_CURRENCIES } from "@/lib/currencies";
import { currencySymbol } from "@/lib/format";

const popular = CURRENCIES.filter((c) => POPULAR_CURRENCIES.includes(c.code));

/** Main-currency step of the welcome flow. The flow saves it together with the theme. */
export function CurrencyPicker({
  value,
  onChange,
  onContinue,
  locale,
}: {
  value: string;
  onChange: (currency: string) => void;
  onContinue: () => void;
  locale: string;
}) {
  return (
    <div className="space-y-6">
      <ToggleGroup
        type="single"
        value={POPULAR_CURRENCIES.includes(value) ? value : ""}
        onValueChange={(next) => next && onChange(next)}
        spacing={2}
        aria-label="Popular currencies"
        className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {popular.map((c) => (
          <ToggleGroupItem
            key={c.code}
            value={c.code}
            className="h-auto min-w-0 flex-col items-start gap-1 rounded-2xl border border-transparent bg-card p-4 text-left ring-1 ring-foreground/10 hover:bg-muted data-[state=on]:border-brand/60 data-[state=on]:bg-brand/15"
          >
            <span className="text-2xl font-semibold">{currencySymbol({ currency: c.code, locale })}</span>
            <span className="font-semibold">{c.code}</span>
            <span className="w-full truncate text-xs font-normal text-muted-foreground">{c.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Or pick another currency</p>
        <CurrencySelect value={value} onValueChange={onChange} ariaLabel="All currencies" />
      </div>

      <Button className="h-12 w-full rounded-xl text-base" onClick={onContinue}>
        Continue with {value}
        <ArrowRightIcon />
      </Button>
      <p className="text-center text-xs text-muted-foreground">You can change this any time in Profile → Main currency.</p>
    </div>
  );
}
