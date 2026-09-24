import type { Metadata } from "next";

import { DownloadButton } from "@/components/download-button";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { ReportTabs } from "@/components/report-tabs";
import { MonthReport } from "@/components/reports/month-report";
import { OverallReport } from "@/components/reports/overall-report";
import { getMonthSummary, getOverallSummary, requireActiveProfile } from "@/lib/data";
import { formatMonth, monthBounds, resolveMonth } from "@/lib/dates";
import { getAppConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Reports" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const REPORT_VIEWS = [
  { value: "month", label: "This month" },
  { value: "overall", label: "Overall" },
];

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const config = getAppConfig(profile.currency);
  const view = params.view === "overall" ? "overall" : "month";
  const month = resolveMonth(params.month, config);
  const bounds = monthBounds(config);

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          view === "month" ? `A closer look at ${formatMonth(month, config.locale)}.` : "Everything since you started tracking."
        }
        actions={
          <>
            {view === "month" ? (
              <MonthSwitcher month={month} min={bounds.min} max={bounds.current} className="w-full md:w-auto" />
            ) : null}
            <DownloadButton
              href={view === "month" ? `/api/export?scope=me&month=${month}` : "/api/export?scope=me"}
              label={view === "month" ? "Download month" : "Download all"}
              className="w-full md:w-auto"
            />
          </>
        }
      />

      <ReportTabs value={view} options={REPORT_VIEWS} />

      {view === "month" ? (
        <MonthReport
          summary={await getMonthSummary(month, null)}
          month={month}
          today={bounds.today}
          isCurrentMonth={month === bounds.current}
          config={config}
        />
      ) : (
        <OverallReport overall={await getOverallSummary(null)} config={config} />
      )}
    </>
  );
}
