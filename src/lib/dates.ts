import type { MonthKey } from "@/lib/types";

// All calendar math works on plain "YYYY-MM-DD" / "YYYY-MM" strings in UTC so
// a date never shifts by a day because of the device's or server's time zone.

const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_KEY_RE.test(value);
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toUtcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Today's calendar date ("YYYY-MM-DD") in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function monthOf(date: string): MonthKey {
  return date.slice(0, 7);
}

export function monthStart(month: MonthKey): string {
  return `${month}-01`;
}

export function addDays(date: string, delta: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return fromUtcDate(d);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function clampMonth(month: MonthKey, min: MonthKey, max: MonthKey): MonthKey {
  if (month < min) return min;
  if (month > max) return max;
  return month;
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Every date of the month, "YYYY-MM-DD". */
export function datesOfMonth(month: MonthKey): string[] {
  return Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

export interface MonthBounds {
  current: MonthKey;
  min: MonthKey;
  today: string;
}

export function monthBounds(config: { timeZone: string; startMonth: MonthKey }): MonthBounds {
  const today = todayIn(config.timeZone);
  const current = monthOf(today);
  return { today, current, min: config.startMonth < current ? config.startMonth : current };
}

/** Turns a `?month=` search param into a safe month key within the app's range. */
export function resolveMonth(
  param: string | string[] | undefined,
  config: { timeZone: string; startMonth: MonthKey },
): MonthKey {
  const { current, min } = monthBounds(config);
  const value = Array.isArray(param) ? param[0] : param;
  return isMonthKey(value) ? clampMonth(value, min, current) : current;
}

export function formatMonth(month: MonthKey, locale: string, style: "long" | "short" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: style, year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export function formatMonthShort(month: MonthKey, locale: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function formatDate(date: string, locale: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
    timeZone: "UTC",
  }).format(toUtcDate(date));
}

export function formatDayHeading(date: string, today: string, locale: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return formatDate(date, locale, { weekday: "short", day: "numeric", month: "short", year: undefined });
}

export function formatDateTime(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function greeting(timeZone: string, now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
