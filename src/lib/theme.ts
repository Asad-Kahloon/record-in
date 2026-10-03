export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Light unless someone chose otherwise. */
export const DEFAULT_THEME: Theme = "light";

/**
 * The theme on this device. Signed-in pages also save it to the account (which
 * wins when the two differ); signed-out pages only ever use this cookie.
 */
export const THEME_COOKIE = "recordin_theme";

/** Page background per theme, for the browser and phone status bar (`theme-color`). */
export const THEME_COLOR: Record<Theme, string> = {
  light: "#f6f6f9",
  dark: "#0a0a0d",
};

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
