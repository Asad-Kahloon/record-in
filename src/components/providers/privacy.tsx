"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PRIVACY_COOKIE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PrivacyState {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyState | null>(null);

export function PrivacyProvider({ initialHidden, children }: { initialHidden: boolean; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(initialHidden);

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      document.documentElement.dataset.privacy = next ? "on" : "off";
      document.cookie = `${PRIVACY_COOKIE}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyState {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error("usePrivacy must be used inside <PrivacyProvider>");
  return context;
}

/** Eye button that hides or shows every amount in the app. */
export function PrivacyToggle({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
}) {
  const { hidden, toggle } = usePrivacy();
  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      className={cn(className)}
    >
      {hidden ? <EyeOffIcon /> : <EyeIcon />}
    </Button>
  );
}
