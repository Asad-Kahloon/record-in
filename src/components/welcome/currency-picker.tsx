"use client";

import { ArrowRightIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setCurrencyAction } from "@/app/actions/account";
import { CurrencySelect } from "@/components/currency-select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CURRENCIES, isSupportedCurrency, POPULAR_CURRENCIES } from "@/lib/currencies";
import { currencySymbol } from "@/lib/format";

const popular = CURRENCIES.filter((c) => POPULAR_CURRENCIES.includes(c.code));

export function CurrencyPicker({ suggested, locale }: { suggested: string; locale: string }) {
  const [value, setValue] = useState(isSupportedCurrency(suggested) ? suggested : "PKR");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      // Redirects to the dashboard on success.
      const result = await setCurrencyAction(value, { then: "dashboard" });
      if (result && !result.ok) toast.error(result.error);
    });

  return (
    <div className="space-y-6">
      <ToggleGroup
        type="single"
        value={POPULAR_CURRENCIES.includes(value) ? value : ""}
        onValueChange={(next) => next && setValue(next)}
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
        <CurrencySelect value={value} onValueChange={setValue} ariaLabel="All currencies" />
      </div>

      <Button className="h-12 w-full rounded-xl text-base" onClick={submit} disabled={pending}>
        {pending ? <Spinner /> : null}
        Continue with {value}
        <ArrowRightIcon />
      </Button>
      <p className="text-center text-xs text-muted-foreground">You can change this any time in Profile → Main currency.</p>
    </div>
  );
}
