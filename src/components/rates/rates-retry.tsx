"use client";

import { RefreshCwIcon } from "lucide-react";

import { useLiveRefresh } from "@/components/rates/live-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Try again now — and keep trying in the background while the page is open. */
export function RatesRetry() {
  const { pending, refresh } = useLiveRefresh();
  return (
    <Button variant="outline" onClick={refresh} disabled={pending}>
      <RefreshCwIcon className={cn(pending && "animate-spin")} />
      Try again
    </Button>
  );
}
