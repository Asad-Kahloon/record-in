"use client";

import { createContext, useCallback, useContext } from "react";

import { formatMoney } from "@/lib/format";

export interface ClientAppConfig {
  /** The viewer's main currency (or the viewed account's, in admin read-only views). */
  currency: string;
  locale: string;
  timeZone: string;
  startMonth: string;
  editWindowMinutes: number;
}

const AppConfigContext = createContext<ClientAppConfig | null>(null);

export function AppConfigProvider({ value, children }: { value: ClientAppConfig; children: React.ReactNode }) {
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): ClientAppConfig {
  const context = useContext(AppConfigContext);
  if (!context) throw new Error("useAppConfig must be used inside <AppConfigProvider>");
  return context;
}

type MoneyOptions = Parameters<typeof formatMoney>[2] & { currency?: string };

/** Formats money in the main currency, or in `options.currency` for an original amount. */
export function useMoney() {
  const { currency, locale } = useAppConfig();
  return useCallback(
    (amount: number, options?: MoneyOptions) =>
      formatMoney(amount, { currency: options?.currency ?? currency, locale }, options),
    [currency, locale],
  );
}
