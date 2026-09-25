import type { NotificationItem } from "@/lib/types";

export type NotificationTone = "expense" | "income" | "debt" | "goal" | "user";

export interface NotificationText {
  tone: NotificationTone;
  title: string;
  detail: string;
}

type MoneyFormatter = (amount: number, options?: { currency?: string }) => string;

const join = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(" · ");

/** "this week" for the rhythm an aim is saved at. */
const cadenceWhen = (cadence: unknown) =>
  ({ daily: "today", weekly: "this week", monthly: "this month", yearly: "this year" })[String(cadence)] ?? "";

/** Human-readable text for an activity notification (amounts in the entry's own currency). */
export function describeNotification(item: NotificationItem, money: MoneyFormatter): NotificationText {
  const who = item.actor_name || item.payload.actor_name || "Someone";
  const currency = item.payload.currency ?? undefined;
  const hasAmount = item.payload.amount !== undefined && item.payload.amount !== null;
  const amount = hasAmount ? money(Number(item.payload.amount), { currency }) : "";
  const previous =
    item.payload.previous_amount !== undefined && Number(item.payload.previous_amount) !== Number(item.payload.amount)
      ? money(Number(item.payload.previous_amount), { currency })
      : null;
  const label = item.payload.label ?? "";
  const changed = previous ? `${previous} → ${amount}` : amount;
  const borrowed = item.payload.direction === "borrowed";

  switch (item.type) {
    case "expense_added":
      return { tone: "expense", title: `${who} added an expense`, detail: join(amount, label) };
    case "expense_updated":
      return { tone: "expense", title: `${who} edited an expense`, detail: join(changed, label) };
    case "expense_deleted":
      return { tone: "expense", title: `${who} deleted an expense`, detail: join(amount, label) };
    case "income_added":
      return { tone: "income", title: `${who} added income`, detail: join(amount, label) };
    case "income_updated":
      return { tone: "income", title: `${who} edited an income entry`, detail: join(changed, label) };
    case "income_deleted":
      return { tone: "income", title: `${who} deleted an income entry`, detail: join(amount, label) };
    case "debt_added":
      return {
        tone: "debt",
        title: borrowed ? `${who} borrowed money` : `${who} lent money`,
        detail: join(amount, borrowed ? `from ${label}` : `to ${label}`),
      };
    case "debt_updated":
      return { tone: "debt", title: `${who} edited a borrow/lend entry`, detail: join(changed, label) };
    case "debt_deleted":
      return { tone: "debt", title: `${who} deleted a borrow/lend entry`, detail: join(amount, label) };
    case "debt_settled":
      return {
        tone: "debt",
        title: borrowed ? `${who} paid back a debt` : `${who} got money back`,
        detail: join(amount, borrowed ? `to ${label}` : `from ${label}`),
      };
    case "debt_reopened":
      return { tone: "debt", title: `${who} marked a debt as pending again`, detail: join(amount, label) };
    case "goal_due":
      return {
        tone: "goal",
        title: `Time to save for ${label || "your aim"}`,
        detail: join(amount, cadenceWhen(item.payload.cadence)),
      };
    case "goal_missed":
      return {
        tone: "goal",
        title: `${label || "An aim"} fell behind`,
        detail: join(
          item.payload.missed_amount ? `short by ${money(Number(item.payload.missed_amount), { currency })}` : "",
          "add time or save a bit more",
        ),
      };
    case "goal_saved":
      return { tone: "goal", title: `${who} set money aside`, detail: join(amount, label) };
    case "goal_withdrawn":
      return { tone: "goal", title: `${who} took money back out`, detail: join(amount, label) };
    case "goal_achieved":
      return { tone: "goal", title: `${label || "Your aim"} is fully funded 🎉`, detail: amount };
    case "user_joined":
      return { tone: "user", title: `${who} created an account`, detail: item.payload.email ?? "New member" };
    default:
      return { tone: "user", title: "New activity", detail: "" };
  }
}
