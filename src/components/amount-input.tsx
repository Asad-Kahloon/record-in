"use client";

import { ArrowRightLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { getRateAction } from "@/app/actions/account";
import { CurrencySelect } from "@/components/currency-select";
import { useAppConfig } from "@/components/providers/app-config";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { currencySymbol, formatMoney, formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Keeps digits and a single decimal point with at most 2 decimals. */
export function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 9);
  const whole = cleaned.slice(0, dot).slice(0, 9);
  const decimals = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${whole || "0"}.${decimals}`;
}

/** Today's rate from one currency into another, for the live preview only. */
function useRate(from: string, to: string) {
  const key = `${from}>${to}`;
  const [state, setState] = useState<{ key: string; rate: number | null }>({ key: "", rate: null });

  useEffect(() => {
    if (from === to) return;
    let cancelled = false;
    getRateAction(from, to)
      .then((rate) => !cancelled && setState({ key, rate }))
      .catch(() => !cancelled && setState({ key, rate: null }));
    return () => {
      cancelled = true;
    };
  }, [from, to, key]);

  if (from === to) return { rate: 1, loading: false };
  return state.key === key ? { rate: state.rate, loading: false } : { rate: null, loading: true };
}

export function AmountInput({
  id,
  value,
  onChange,
  currency,
  onCurrencyChange,
  invalid,
  disabled,
  autoFocus,
  convertTo,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  currency: string;
  /** Omit to lock the amount to the given currency (no picker). */
  onCurrencyChange?: (currency: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Currency the live preview converts into (defaults to the main currency). */
  convertTo?: string;
}) {
  const { currency: mainCurrency, locale } = useAppConfig();
  const base = convertTo ?? mainCurrency;
  const { rate, loading } = useRate(currency, base);
  const amount = Number(value) || 0;

  return (
    <div className="flex flex-col gap-2">
      <InputGroup className={cn("h-16 rounded-2xl bg-input/20", invalid && "border-destructive")}>
        <InputGroupAddon className="pl-4 text-lg text-muted-foreground">{currencySymbol({ currency, locale })}</InputGroupAddon>
        <InputGroupInput
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          enterKeyHint="next"
          value={value}
          onChange={(event) => onChange(sanitizeAmount(event.target.value))}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          autoFocus={autoFocus}
          className="h-full min-w-0 text-3xl font-semibold tracking-tight md:text-3xl"
        />
        {onCurrencyChange ? (
          <InputGroupAddon align="inline-end" className="pr-2">
            <CurrencySelect
              compact
              value={currency}
              onValueChange={onCurrencyChange}
              disabled={disabled}
              ariaLabel="Currency of this amount"
            />
          </InputGroupAddon>
        ) : (
          <InputGroupAddon align="inline-end" className="pr-4 text-sm font-semibold text-muted-foreground">
            {currency}
          </InputGroupAddon>
        )}
      </InputGroup>

      {currency !== base ? (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-xs text-muted-foreground" aria-live="polite">
          <ArrowRightLeftIcon className="size-3.5 shrink-0 text-brand" />
          {loading ? (
            "Getting today's exchange rate…"
          ) : rate ? (
            <>
              <span className="font-medium text-foreground">≈ {formatMoney(amount * rate, { currency: base, locale })}</span>
              <span>
                · 1 {currency} = {formatRate(rate, locale)} {base}
              </span>
            </>
          ) : (
            "Couldn't load today's rate right now. It's checked again when you save."
          )}
        </p>
      ) : null}
    </div>
  );
}
