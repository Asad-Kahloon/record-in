/**
 * Server-side configuration. Nothing in here is sent to the browser — client
 * components receive the formatting settings through <AppConfigProvider>.
 */

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function required(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (and to your Vercel project for production).`,
    );
  }
  return value;
}

function validCurrency(locale: string, currency: string) {
  try {
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(1);
    return true;
  } catch {
    return false;
  }
}

function validTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseKey() {
    return required("SUPABASE_PUBLISHABLE_KEY");
  },
  get appUrl() {
    return read("APP_URL")?.replace(/\/+$/, "");
  },
  get startMonth() {
    const value = read("APP_START_MONTH");
    return value && MONTH_KEY.test(value) ? value : "2026-09";
  },
  get locale() {
    const locale = read("APP_LOCALE") ?? "en-PK";
    return validCurrency(locale, "USD") ? locale : "en-US";
  },
  get currency() {
    const currency = read("APP_CURRENCY") ?? "PKR";
    return validCurrency(this.locale, currency) ? currency : "USD";
  },
  get timeZone() {
    const timeZone = read("APP_TIMEZONE") ?? "Asia/Karachi";
    return validTimeZone(timeZone) ? timeZone : "UTC";
  },
};

export interface AppConfig {
  currency: string;
  locale: string;
  timeZone: string;
  startMonth: string;
}

/** Formatting settings; pass the user's main currency when there is one. */
export function getAppConfig(currency?: string | null): AppConfig {
  return {
    currency: currency && validCurrency(env.locale, currency) ? currency : env.currency,
    locale: env.locale,
    timeZone: env.timeZone,
    startMonth: env.startMonth,
  };
}
