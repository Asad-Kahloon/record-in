import { todayIn } from "@/lib/dates";
import type { Debt, DebtPayment, Expense, Income } from "@/lib/types";

export type TransactionFlow = "in" | "out";

interface TransactionBase {
  key: string;
  /** Calendar date used for grouping ("YYYY-MM-DD"). */
  date: string;
  created_at: string;
  flow: TransactionFlow;
  title: string;
  amount: number;
  currency: string;
  base_amount: number;
  editable: boolean;
}

export type Transaction =
  | (TransactionBase & { kind: "expense"; expense: Expense })
  | (TransactionBase & { kind: "income"; income: Income })
  | (TransactionBase & { kind: "debt"; event: "open" | "settle"; debt: Debt })
  | (TransactionBase & { kind: "debt"; event: "payment"; debt: Debt; payment: DebtPayment });

/**
 * One money-movement feed for a month. A debt appears when it happens
 * (borrowed = money in, lent = money out) and again for every repayment
 * (paying back = money out, receiving = money in). Debts settled before part
 * repayments existed have no repayment rows, so they show one settle entry.
 */
export function buildTransactions({
  expenses,
  incomes,
  debts,
  month,
  timeZone,
}: {
  expenses: Expense[];
  incomes: Income[];
  debts: Debt[];
  month: string;
  timeZone: string;
}): Transaction[] {
  const list: Transaction[] = [];

  for (const e of expenses) {
    list.push({
      key: `expense:${e.id}`,
      kind: "expense",
      expense: e,
      date: e.spent_on,
      created_at: e.created_at,
      flow: "out",
      title: e.description,
      amount: e.amount,
      currency: e.currency,
      base_amount: e.base_amount,
      editable: e.can_edit,
    });
  }

  for (const i of incomes) {
    const added = todayIn(timeZone, new Date(i.created_at));
    list.push({
      key: `income:${i.id}`,
      kind: "income",
      income: i,
      // Income belongs to a month; show it on the day it was recorded when that's inside the month.
      date: added.startsWith(month) ? added : `${month}-01`,
      created_at: i.created_at,
      flow: "in",
      title: i.source,
      amount: i.amount,
      currency: i.currency,
      base_amount: i.base_amount,
      editable: i.can_edit,
    });
  }

  for (const d of debts) {
    const borrowed = d.direction === "borrowed";
    const money = { amount: d.amount, currency: d.currency, base_amount: d.base_amount };
    if (d.occurred_on.startsWith(month)) {
      list.push({
        key: `debt:${d.id}:open`,
        kind: "debt",
        event: "open",
        debt: d,
        date: d.occurred_on,
        created_at: d.created_at,
        flow: borrowed ? "in" : "out",
        title: borrowed ? `Borrowed from ${d.counterparty}` : `Lent to ${d.counterparty}`,
        editable: d.can_edit,
        ...money,
      });
    }
    for (const p of d.payments) {
      if (!p.paid_on.startsWith(month)) continue;
      list.push({
        key: `debt:${d.id}:payment:${p.id}`,
        kind: "debt",
        event: "payment",
        debt: d,
        payment: p,
        date: p.paid_on,
        created_at: p.created_at,
        flow: borrowed ? "out" : "in",
        title: borrowed ? `Paid back ${d.counterparty}` : `Received from ${d.counterparty}`,
        amount: p.amount,
        currency: p.currency,
        base_amount: p.base_amount,
        editable: p.can_undo,
      });
    }
    if (d.payments.length === 0 && d.settled_on?.startsWith(month)) {
      list.push({
        key: `debt:${d.id}:settle`,
        kind: "debt",
        event: "settle",
        debt: d,
        date: d.settled_on,
        created_at: d.updated_at,
        flow: borrowed ? "out" : "in",
        title: borrowed ? `Paid back ${d.counterparty}` : `Received from ${d.counterparty}`,
        editable: false,
        ...money,
      });
    }
  }

  return list.sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)));
}

export function transactionTotals(list: Transaction[]) {
  let moneyIn = 0;
  let moneyOut = 0;
  for (const t of list) {
    if (t.flow === "in") moneyIn += t.base_amount;
    else moneyOut += t.base_amount;
  }
  return { moneyIn, moneyOut, net: moneyIn - moneyOut };
}
