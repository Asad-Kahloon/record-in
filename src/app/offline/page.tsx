import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/** Shown by the service worker when a page is opened with no connection. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-app-glow p-6">
      <Brand />
      <Empty className="max-w-md border border-dashed bg-card/70 py-10 backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-muted text-foreground">
            <CloudOffIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-base">You&apos;re offline</EmptyTitle>
          <EmptyDescription>
            {APP_NAME} needs a connection to show your records. Anything you were about to add is safe — reconnect and try
            again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard">
              <RefreshCwIcon />
              Try again
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
