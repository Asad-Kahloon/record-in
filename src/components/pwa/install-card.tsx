"use client";

import { CheckIcon, DownloadIcon, MonitorIcon, ShareIcon, SmartphoneIcon, SquarePlusIcon } from "lucide-react";

import { useInstall } from "@/components/pwa/install";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Full card for the profile page: install, or how to install by hand. */
export function InstallCard({ className }: { className?: string }) {
  const { canPrompt, installed, platform, install } = useInstall();

  return (
    <Card className={className} data-tour="install">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DownloadIcon className="size-4.5 text-brand" />
          Install {APP_NAME}
        </CardTitle>
        <CardDescription>
          {installed
            ? `${APP_NAME} is installed on this device.`
            : "Keep it on your Home Screen or desktop — it opens full-screen and works without a connection."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {installed ? (
          <p className="flex items-center gap-2 rounded-xl bg-positive/10 px-3 py-2.5 text-sm text-positive">
            <CheckIcon className="size-4" />
            Running as an installed app
          </p>
        ) : canPrompt ? (
          <Button className="h-11 rounded-xl text-base" onClick={() => void install()}>
            <DownloadIcon />
            Install on this device
          </Button>
        ) : platform === "ios" ? (
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <SmartphoneIcon className="size-4 shrink-0 text-brand" />
              Open this page in Safari
            </li>
            <li className="flex items-center gap-2">
              <ShareIcon className="size-4 shrink-0 text-brand" />
              Tap Share
            </li>
            <li className="flex items-center gap-2">
              <SquarePlusIcon className="size-4 shrink-0 text-brand" />
              Tap <span className="font-medium text-foreground">Add to Home Screen</span>
            </li>
          </ol>
        ) : (
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MonitorIcon className="size-4 shrink-0 text-brand" />
              Open the browser menu (or the icon in the address bar)
            </li>
            <li className="flex items-center gap-2">
              <SquarePlusIcon className="size-4 shrink-0 text-brand" />
              Choose <span className="font-medium text-foreground">Install</span> or{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span>
            </li>
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** Compact row for the More sheet — only shown when it can actually install. */
export function InstallButton({ className, onDone }: { className?: string; onDone?: () => void }) {
  const { canPrompt, installed, install } = useInstall();
  if (installed || !canPrompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await install();
        onDone?.();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl bg-brand/10 p-4 text-left ring-1 ring-brand/20 transition-colors hover:bg-brand/15",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
        <DownloadIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Install {APP_NAME}</span>
        <span className="block text-xs text-muted-foreground">Full-screen, on your Home Screen</span>
      </span>
    </button>
  );
}
