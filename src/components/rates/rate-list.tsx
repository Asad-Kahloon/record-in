"use client";

import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CurrencySelect } from "@/components/currency-select";
import { useAppConfig } from "@/components/providers/app-config";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { CURRENCIES, crossRate } from "@/lib/currencies";
import { formatTime } from "@/lib/dates";
import { formatPercent, formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Moves smaller than this are rounding noise, not news. */
const NOISE = 0.00005;

export function RateList({
  rates,
  openedRates,
  openedAt,
  base,
  onBaseChange,
  onPick,
}: {
  rates: Record<string, number>;
  /** The rates when the page was opened — changes are shown against these. */
  openedRates: Record<string, number>;
  openedAt: number;
  base: string;
  onBaseChange: (code: string) => void;
  /** Tapping a row loads that pair into the converter. */
  onPick: (code: string) => void;
}) {
  const { locale, timeZone } = useAppConfig();
  const [query, setQuery] = useState("");

  // Rows whose rate moved on the latest refresh light up for a moment.
  const previous = useRef(rates);
  const [moved, setMoved] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const changed = CURRENCIES.map((c) => c.code).filter((code) => previous.current[code] !== rates[code]);
    previous.current = rates;
    if (!changed.length) return;
    setMoved(new Set(changed));
    const id = setTimeout(() => setMoved(new Set()), 1600);
    return () => clearTimeout(id);
  }, [rates]);

  const q = query.trim().toLowerCase();
  const rows = CURRENCIES.filter(
    (c) => c.code !== base && (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)),
  );

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Rates in {base}</CardTitle>
        <CardDescription>
          What one unit of each currency is worth. Arrows show movement since{" "}
          {formatTime(new Date(openedAt).toISOString(), locale, timeZone)}, when you opened this page.
        </CardDescription>
        <CardAction>
          <CurrencySelect compact value={base} onValueChange={onBaseChange} ariaLabel="Show rates in" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <InputGroup className="h-11 rounded-xl">
          <InputGroupAddon className="pl-3">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Search currencies"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search currencies"
          />
        </InputGroup>

        {rows.length === 0 ? (
          <Empty className="border py-8">
            <EmptyHeader>
              <EmptyTitle className="text-sm">No currency matches “{query.trim()}”</EmptyTitle>
              <EmptyDescription>Try a code like USD or a name like Dirham.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="-mx-1.5 gap-0.5">
            {rows.map((currency) => {
              const rate = crossRate(rates, currency.code, base);
              const opened = crossRate(openedRates, currency.code, base);
              const change = opened ? rate / opened - 1 : 0;
              const showChange = Math.abs(change) >= NOISE;
              return (
                <Item
                  key={currency.code}
                  asChild
                  className={cn(
                    "flex-nowrap rounded-xl px-2.5 py-2.5 text-left transition-colors duration-700 hover:bg-muted/60 active:bg-muted",
                    moved.has(currency.code) && "bg-brand/10 duration-150",
                  )}
                >
                  <button type="button" onClick={() => onPick(currency.code)}>
                    <ItemMedia>
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-xs font-bold tracking-wide">
                        {currency.code}
                      </span>
                    </ItemMedia>
                    <ItemContent className="min-w-0 gap-0.5">
                      <ItemTitle className="w-full truncate">{currency.name}</ItemTitle>
                      <ItemDescription className="truncate text-xs tabular-nums">
                        1 {base} = {rate ? formatRate(1 / rate, locale) : "—"} {currency.code}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex-col items-end gap-0.5">
                      <span className="font-semibold tabular-nums">
                        {rate ? formatRate(rate, locale) : "—"}{" "}
                        <span className="text-xs font-normal text-muted-foreground">{base}</span>
                      </span>
                      {showChange ? (
                        <span
                          className={cn(
                            "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
                            change > 0 ? "text-positive" : "text-destructive",
                          )}
                        >
                          {change > 0 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
                          {formatPercent(Math.abs(change), locale, 2)}
                        </span>
                      ) : null}
                    </ItemActions>
                  </button>
                </Item>
              );
            })}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
