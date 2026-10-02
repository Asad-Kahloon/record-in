"use client";

import { useRef, useState } from "react";

import { useAppConfig } from "@/components/providers/app-config";
import { RateConverter } from "@/components/rates/rate-converter";
import { RateList } from "@/components/rates/rate-list";
import { POPULAR_CURRENCIES } from "@/lib/currencies";
import type { RatesSnapshot } from "@/lib/types";

/** Converter + full rate list, sharing one set of live rates. */
export function RatesView({ snapshot }: { snapshot: RatesSnapshot }) {
  const { currency } = useAppConfig();
  const converter = useRef<HTMLDivElement>(null);

  // Kept from the first render, so arrows show movement while the page is open.
  const [opened] = useState(() => snapshot);
  const [base, setBase] = useState(currency);
  const [pair, setPair] = useState(() => ({
    from: POPULAR_CURRENCIES.find((code) => code !== currency) ?? "USD",
    to: currency,
  }));

  return (
    <div className="grid gap-4 @4xl/main:grid-cols-5 @4xl/main:items-start">
      <div ref={converter} className="scroll-mt-20 @4xl/main:sticky @4xl/main:top-20 @4xl/main:col-span-2">
        <RateConverter
          rates={snapshot.rates}
          from={pair.from}
          to={pair.to}
          onFromChange={(from) => setPair((p) => ({ ...p, from }))}
          onToChange={(to) => setPair((p) => ({ ...p, to }))}
          onSwap={() => setPair((p) => ({ from: p.to, to: p.from }))}
        />
      </div>
      <div className="@4xl/main:col-span-3">
        <RateList
          rates={snapshot.rates}
          openedRates={opened.rates}
          openedAt={opened.updatedAt}
          base={base}
          onBaseChange={setBase}
          onPick={(code) => {
            setPair({ from: code, to: base });
            converter.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>
    </div>
  );
}
