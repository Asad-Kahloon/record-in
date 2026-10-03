"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { setThemeAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { THEME_COLOR, THEME_COOKIE, themeCookie, type Theme } from "@/lib/theme";
import type { ActionResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThemeState {
  theme: Theme;
  /** Switches the screen and this device's cookie right away. Never touches the account. */
  apply: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

/** Only signed-in pages provide this: how to save the theme on the account. */
const SaveThemeContext = createContext<((theme: Theme) => Promise<ActionResult>) | null>(null);

function paint(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", THEME_COLOR[theme]);
  }
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  document.cookie = themeCookie(theme);
}

/**
 * The current theme. The server already rendered <html> in it (the account's
 * theme when signed in, this device's cookie otherwise), so there is no flash.
 */
export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: React.ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);

  // A server re-render can bring a newer theme (e.g. changed on another device).
  const [rendered, setRendered] = useState(initialTheme);
  if (initialTheme !== rendered) {
    setRendered(initialTheme);
    setTheme(initialTheme);
  }

  // Keep this device's cookie in step with what the server chose, so signed-out
  // pages (after signing out, say) keep the same look.
  useEffect(() => {
    if (!document.cookie.split("; ").includes(`${THEME_COOKIE}=${initialTheme}`)) {
      document.cookie = themeCookie(initialTheme);
    }
  }, [initialTheme]);

  const apply = useCallback((next: Theme) => {
    paint(next);
    setTheme(next);
  }, []);

  const value = useMemo(() => ({ theme, apply }), [theme, apply]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Wraps signed-in pages so theme changes are also saved on the account. */
export function SaveThemeToAccount({ children }: { children: React.ReactNode }) {
  return <SaveThemeContext.Provider value={setThemeAction}>{children}</SaveThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext)?.theme ?? "light";
}

// Only the newest save may undo the screen if it fails; older ones are stale.
let latestSave = 0;

/**
 * Pick a theme: the screen changes first, then — on signed-in pages only — the
 * account is updated. If saving fails the screen goes back and says why.
 */
export function useThemeControl() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeControl must be used inside <ThemeProvider>");
  const save = useContext(SaveThemeContext);
  const { theme, apply } = context;
  const [saving, startTransition] = useTransition();

  const choose = useCallback(
    (next: Theme) => {
      if (next === theme) return;
      const previous = theme;
      apply(next);
      if (!save) return; // signed out: this device only, never the database
      const request = ++latestSave;
      startTransition(async () => {
        const result = await save(next);
        if (!result.ok && request === latestSave) {
          apply(previous);
          toast.error(result.error);
        }
      });
    },
    [theme, apply, save],
  );

  const toggle = useCallback(() => choose(theme === "dark" ? "light" : "dark"), [choose, theme]);
  return { theme, choose, toggle, saving };
}

/** Sun / moon button that flips between light and dark. */
export function ThemeToggle({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
}) {
  const { theme, toggle } = useThemeControl();
  const dark = theme === "dark";
  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={cn(className)}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
