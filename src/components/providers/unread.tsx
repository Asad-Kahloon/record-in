"use client";

import { BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getUnreadCountAction } from "@/app/actions/account";

export const LOGIN_TOAST_KEY = "ledger:activity-toast-shown";
const POLL_MS = 60_000;

interface UnreadState {
  count: number;
  setCount: (count: number) => void;
  refresh: () => Promise<void>;
}

const UnreadContext = createContext<UnreadState | null>(null);

export function UnreadProvider({ initialCount, children }: { initialCount: number; children: React.ReactNode }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);

  // A server re-render (e.g. after marking as read) brings a fresh number.
  useEffect(() => setCount(initialCount), [initialCount]);

  const refresh = useCallback(async () => {
    try {
      setCount(await getUnreadCountAction());
    } catch {
      // Offline or signed out — keep the last known value.
    }
  }, []);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener("focus", poll);
    };
  }, [refresh]);

  // Right after signing in, surface anything that happened while away (once per tab session).
  useEffect(() => {
    if (initialCount <= 0) return;
    try {
      if (window.sessionStorage.getItem(LOGIN_TOAST_KEY)) return;
      window.sessionStorage.setItem(LOGIN_TOAST_KEY, "1");
    } catch {
      return;
    }
    toast(`You have ${initialCount} new update${initialCount === 1 ? "" : "s"}`, {
      description: "Here's what changed since you were last here.",
      icon: <BellIcon className="size-4" />,
      action: { label: "View", onClick: () => router.push("/notifications") },
      duration: 8000,
    });
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ count, setCount, refresh }), [count, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): UnreadState {
  const context = useContext(UnreadContext);
  if (!context) throw new Error("useUnread must be used inside <UnreadProvider>");
  return context;
}
