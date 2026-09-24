import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { categoryIcon } from "@/lib/categories";
import { getAppConfig } from "@/lib/env";
import { formatMoney } from "@/lib/format";

/** Split auth layout adapted from the shadcn login-02 / signup-02 blocks. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-app-glow px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:px-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/login" aria-label="Home">
            <Brand />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground md:justify-start">
          <ShieldCheckIcon className="size-3.5" />
          Private by design — every account only sees its own records.
        </p>
      </div>
      <AuthShowcase />
    </div>
  );
}

function AuthShowcase() {
  const config = getAppConfig();
  const money = (n: number) => formatMoney(n, config);
  const rows = [
    { slug: "groceries", name: "Groceries", amount: 18450, share: 78 },
    { slug: "bills", name: "Bills & Utilities", amount: 12300, share: 52 },
    { slug: "transport", name: "Transport", amount: 6900, share: 29 },
  ];

  return (
    <div className="relative hidden overflow-hidden border-l bg-sidebar lg:flex lg:flex-col lg:items-center lg:justify-center">
      <div aria-hidden className="absolute -top-40 -left-24 size-[32rem] rounded-full bg-brand/25 blur-[120px]" />
      <div aria-hidden className="absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-income/15 blur-[120px]" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      <div className="relative w-full max-w-md space-y-5 px-10" aria-hidden>
        <div className="rounded-3xl border border-white/10 bg-card/70 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Left to spend this month</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">{money(104350)}</p>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-brand/15">
            <div className="h-full w-[44%] rounded-full bg-brand" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-background/40 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-income" />
                Income
              </p>
              <p className="mt-1 font-semibold">{money(185000)}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-expense" />
                Spent
              </p>
              <p className="mt-1 font-semibold">{money(80650)}</p>
            </div>
          </div>
        </div>

        <div className="ml-10 space-y-3 rounded-3xl border border-white/10 bg-card/60 p-5 shadow-2xl backdrop-blur-xl">
          {rows.map((row) => {
            const Icon = categoryIcon(row.slug);
            return (
              <div key={row.slug} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-4.5" />
                </span>
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="font-medium">{money(row.amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-expense/15">
                    <div className="h-full rounded-full bg-expense" style={{ width: `${row.share}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 text-center">
          <p className="text-2xl font-semibold tracking-tight">Know exactly where your money goes.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Monthly income, daily expenses and clear reports — on your phone and your laptop.
          </p>
        </div>
      </div>
    </div>
  );
}
