"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { completeOnboardingAction } from "@/app/actions/account";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { TOUR_STEPS } from "@/components/tour/tour-steps";

interface TourState {
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourState | null>(null);
const TOUR_HOME = "/dashboard";

/**
 * Runs the guided tour. It starts by itself once for accounts that haven't
 * finished it yet, and `start()` replays it from anywhere (it hops to Home
 * first, where the tour targets live).
 */
export function TourProvider({ autoStart, children }: { autoStart: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(autoStart);
  const seen = useRef(!autoStart);

  useEffect(() => {
    if (!pending || pathname !== TOUR_HOME) return;
    // Give the page a moment to lay out so the spotlight lands on the right spot.
    const id = window.setTimeout(() => {
      setPending(false);
      setActive(true);
    }, 600);
    return () => window.clearTimeout(id);
  }, [pending, pathname]);

  const start = useCallback(() => {
    if (pathname !== TOUR_HOME) router.push(TOUR_HOME);
    setActive(false);
    setPending(true);
  }, [pathname, router]);

  const close = useCallback(() => {
    setActive(false);
    if (!seen.current) {
      seen.current = true;
      void completeOnboardingAction();
    }
  }, []);

  const value = useMemo(() => ({ start, active }), [start, active]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active ? <TourOverlay steps={TOUR_STEPS} onClose={close} /> : null}
    </TourContext.Provider>
  );
}

export function useTour(): TourState {
  const context = useContext(TourContext);
  if (!context) throw new Error("useTour must be used inside <TourProvider>");
  return context;
}
