export interface CurrencyInfo {
  code: string;
  name: string;
}

// Popular first — these show as quick picks. Rates for all of them come from the
// exchange-rate provider in src/lib/rates.ts.
export const CURRENCIES: CurrencyInfo[] = [
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "ZAR", name: "South African Rand" },
];

export const POPULAR_CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === "string" && CURRENCY_CODES.includes(code);
}

export function currencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}
