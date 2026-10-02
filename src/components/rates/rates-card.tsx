"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { useAppConfig } from "@/components/providers/app-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { crossRate, POPULAR_CURRENCIES } from "@/lib/currencies";
import { formatTime } from "@/lib/dates";
import { formatRate } from "@/lib/format";
import type { RatesSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Home glance: what the popular currencies are worth in your main currency. */
export function RatesCard({ snapshot, className }: { snapshot: RatesSnapshot; className?: string }) {
  const { currency, locale, timeZone } = useAppConfig();
  const codes = POPULAR_CURRENCIES.filter((code) => code !== currency).slice(0, 4);
  const live = snapshot.kind === "live";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Exchange rates
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 text-[10px]",
              live ? "border-positive/30 bg-positive/10 text-positive" : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            {live ? "Live" : "Daily"}
          </Badge>
        </CardTitle>
        <CardDescription>
          In {currency} · as of {formatTime(new Date(snapshot.updatedAt).toISOString(), locale, timeZone)}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/rates">
              Open
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {codes.map((code) => (
          <Link
            key={code}
            href="/rates"
            className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5 transition-colors hover:bg-muted/70"
          >
            <p className="text-xs font-semibold text-muted-foreground">1 {code}</p>
            <p className="mt-1 truncate text-lg font-semibold tabular-nums">
              {formatRate(crossRate(snapshot.rates, code, currency), locale)}{" "}
              <span className="text-xs font-normal text-muted-foreground">{currency}</span>
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
