import type { Metadata } from "next";

import { DebtList } from "@/components/debts/debt-list";
import { DebtSummaryCards } from "@/components/debts/debt-summary-cards";
import { AddDebtButton } from "@/components/entry-buttons";
import { PageHeader } from "@/components/page-header";
import { ReportButton } from "@/components/reports/report-dialog";
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
        description="Money you owe and money owed to you. Record repayments as the money comes back, in full or in parts."
        actions={
          <>
            <AddDebtButton className="flex-1 md:flex-none" />
            <ReportButton month={bounds.current} defaultPeriod="all" label="Report" className="flex-1 md:flex-none" />
          </>
        }
      />
      <DebtSummaryCards summary={summary} config={config} />
      <DebtList debts={debts} today={bounds.today} />
    </>
  );
}
