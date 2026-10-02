"use client";

import { ArrowUpDownIcon } from "lucide-react";
import { useState } from "react";

import { sanitizeAmount } from "@/components/amount-input";
import { CurrencySelect } from "@/components/currency-select";
import { useAppConfig } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { crossRate, currencyName } from "@/lib/currencies";
import { formatRate } from "@/lib/format";

export function RateConverter({
  rates,
  from,
  to,
  onFromChange,
  onToChange,
  onSwap,
}: {
  rates: Record<string, number>;
  from: string;
  to: string;
  onFromChange: (code: string) => void;
  onToChange: (code: string) => void;
  onSwap: () => void;
}) {
  const { locale } = useAppConfig();
  const [amount, setAmount] = useState("1");
  const rate = crossRate(rates, from, to);
  const result = (Number(amount) || 0) * rate;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Convert</CardTitle>
        <CardDescription>
          {currencyName(from)} to {currencyName(to)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        <InputGroup className="h-16 rounded-2xl bg-input/20">
          <InputGroupInput
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(sanitizeAmount(event.target.value))}
            aria-label={`Amount in ${from}`}
            className="h-full min-w-0 pl-4 text-3xl font-semibold tracking-tight md:text-3xl"
          />
          <InputGroupAddon align="inline-end" className="pr-2">
            <CurrencySelect compact value={from} onValueChange={onFromChange} ariaLabel="Convert from" />
          </InputGroupAddon>
        </InputGroup>

        <div className="relative z-10 -my-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 rounded-full bg-card shadow-sm dark:bg-card"
            onClick={onSwap}
            aria-label="Swap currencies"
          >
            <ArrowUpDownIcon />
          </Button>
        </div>

        <div className="flex h-16 items-center gap-2 rounded-2xl bg-muted/40 pr-2 pl-4 ring-1 ring-foreground/10">
          <output className="min-w-0 flex-1 truncate text-3xl font-semibold tracking-tight tabular-nums" aria-live="polite">
            {formatRate(result, locale)}
          </output>
          <CurrencySelect compact value={to} onValueChange={onToChange} ariaLabel="Convert to" />
        </div>

        {rate ? (
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-xs text-muted-foreground tabular-nums">
            <span>
              1 {from} = <span className="font-medium text-foreground">{formatRate(rate, locale)}</span> {to}
            </span>
            <span>
              1 {to} = {formatRate(1 / rate, locale)} {from}
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
