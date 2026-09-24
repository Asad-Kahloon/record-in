"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // In production Next.js hides server error details; in development the real message helps with setup.
  const detail = process.env.NODE_ENV === "development" ? error.message : undefined;

  return (
    <main className="flex min-h-[70svh] items-center justify-center p-6">
      <Empty className="max-w-md border bg-card/70 backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-destructive/15 text-destructive">
            <TriangleAlertIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Something went wrong</EmptyTitle>
          <EmptyDescription>
            {detail ?? "We couldn't load this page. Please try again in a moment."}
            {error.digest ? <span className="mt-2 block text-xs opacity-70">Reference: {error.digest}</span> : null}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={reset}>
            <RotateCcwIcon />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
