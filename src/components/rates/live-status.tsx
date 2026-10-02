"use client";

import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useAppConfig } from "@/components/providers/app-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import type { RatesSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** How often an open rates page asks for fresh numbers (the server caches for 30s). */
const REFRESH_MS = 30_000;

function ago(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

/** Currency markets close from Friday night to Sunday night (UTC), so rates stand still. */
function marketsClosed(now: number): boolean {
  const date = new Date(now);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  return (day === 5 && hour >= 21) || day === 6 || (day === 0 && hour < 21);
}

/** Keeps the page's server data fresh while it is on screen. */
export function useLiveRefresh(enabled = true) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => document.visibilityState === "visible" && refresh();
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", refresh);
    };
  }, [enabled, refresh]);

  return { pending, refresh };
}

export function LiveStatus({ snapshot }: { snapshot: RatesSnapshot }) {
  const { locale, timeZone } = useAppConfig();
  const { pending, refresh } = useLiveRefresh();
  // Starts null so the server render and hydration match; ticks once a second after.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const live = snapshot.kind === "live";

  return (
    <div className="flex flex-col gap-1.5 md:items-end">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 rounded-full px-2.5 py-1",
            live ? "border-positive/30 bg-positive/10 text-positive" : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          <span className="relative flex size-2">
            {live ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" /> : null}
            <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-positive" : "bg-warning")} />
          </span>
          {live ? "Live" : "Daily rates"}
        </Badge>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {live
            ? `Updated ${now === null ? "just now" : ago(now - snapshot.updatedAt)}`
            : `Updated ${formatDateTime(new Date(snapshot.updatedAt).toISOString(), locale, timeZone)}`}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          onClick={refresh}
          disabled={pending}
          aria-label="Refresh rates"
        >
          <RefreshCwIcon className={cn("size-4", pending && "animate-spin")} />
        </Button>
      </div>
      {!live ? (
        <p className="text-xs text-muted-foreground">The live feed can&apos;t be reached right now, so these are today&apos;s daily rates.</p>
      ) : now !== null && marketsClosed(now) ? (
        <p className="text-xs text-muted-foreground">Currency markets are closed for the weekend, so rates barely move until Monday.</p>
      ) : null}
    </div>
  );
}
