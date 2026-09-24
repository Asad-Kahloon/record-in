"use client";

import { CircleQuestionMarkIcon, EyeOffIcon, SlidersHorizontalIcon } from "lucide-react";

import { usePrivacy } from "@/components/providers/privacy";
import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AppPreferences() {
  const { start } = useTour();
  const { hidden, toggle } = usePrivacy();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
          App
        </CardTitle>
        <CardDescription>Tour and privacy settings.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
            <CircleQuestionMarkIcon className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Guided tour</p>
            <p className="text-xs text-muted-foreground">A quick walkthrough of every section.</p>
          </div>
          <Button variant="outline" size="sm" onClick={start}>
            Replay
          </Button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
            <EyeOffIcon className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Hide amounts</p>
            <p className="text-xs text-muted-foreground">Blur balances and amounts on this device.</p>
          </div>
          <Button variant={hidden ? "default" : "outline"} size="sm" onClick={toggle} aria-pressed={hidden}>
            {hidden ? "On" : "Off"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
