import { Link2OffIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Sign-in problem" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuthErrorPage({ searchParams }: { searchParams: SearchParams }) {
  const { reason } = await searchParams;
  const text = typeof reason === "string" ? reason.slice(0, 200) : "";

  const message =
    !text || text === "link"
      ? "This link is invalid or has expired. Links only work once, and only in the browser where you requested them. If you just confirmed your email, try signing in."
      : text;

  return (
    <AuthShell>
      <Empty className="border bg-card/60 backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-destructive/15 text-destructive">
            <Link2OffIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">We couldn&apos;t sign you in</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/forgot-password">Reset password</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </AuthShell>
  );
}
