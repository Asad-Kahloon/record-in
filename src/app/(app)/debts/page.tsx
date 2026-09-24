import type { Metadata } from "next";

import { DebtList } from "@/components/debts/debt-list";
import { DebtSummaryCards } from "@/components/debts/debt-summary-cards";
import { DownloadButton } from "@/components/download-button";
import { AddDebtButton } from "@/components/entry-buttons";
import { PageHeader } from "@/components/page-header";
import { getDebts, getDebtSummary, requireActiveProfile } from "@/lib/data";
import { monthBounds } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Borrow & lend" };

export default async function DebtsPage() {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);
  const bounds = monthBounds(config);
  const [debts, summary] = await Promise.all([getDebts(null), getDebtSummary(null)]);

  return (
    <>
      <PageHeader
        title="Borrow & lend"
        description="Money you owe and money owed to you. Mark entries as settled once the money moves."
        actions={
          <>
            <AddDebtButton className="flex-1 md:flex-none" />
            <DownloadButton href="/api/export?scope=me" label="CSV" className="hidden md:inline-flex" />
          </>
        }
      />
      <DebtSummaryCards summary={summary} config={config} />
      <DebtList debts={debts} today={bounds.today} />
    </>
  );
}
