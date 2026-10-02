import { CloudOffIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { LiveStatus } from "@/components/rates/live-status";
import { RatesRetry } from "@/components/rates/rates-retry";
import { RatesView } from "@/components/rates/rates-view";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { CURRENCIES } from "@/lib/currencies";
import { requireActiveProfile } from "@/lib/data";
import { getRatesSnapshot } from "@/lib/rates";

export const metadata: Metadata = { title: "Exchange rates" };

export default async function RatesPage() {
  await requireActiveProfile();
  const snapshot = await getRatesSnapshot();

  return (
    <>
      <PageHeader
        title="Exchange rates"
        description={`Live rates between ${CURRENCIES.length} currencies — the same ones used to convert your entries.`}
        actions={snapshot ? <LiveStatus snapshot={snapshot} /> : null}
      />

      {snapshot ? (
        <>
          <RatesView snapshot={snapshot} />
          <p className="px-1 text-xs text-muted-foreground">
            Mid-market reference rates. Banks, exchange companies and card networks add their own margin, so the rate
            you are offered may be a little different.
          </p>
        </>
      ) : (
        <Empty className="border bg-card/50 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-2xl">
              <CloudOffIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-base">Rates are unavailable right now</EmptyTitle>
            <EmptyDescription>Neither rate provider could be reached. Check your connection and try again.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <RatesRetry />
          </EmptyContent>
        </Empty>
      )}
    </>
  );
}
