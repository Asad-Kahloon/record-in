import { ShieldOffIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Account deactivated" };

export default async function SuspendedPage() {
  const profile = await requireProfile();
  if (profile.is_active) redirect("/dashboard");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-app-glow p-6">
      <Brand />
      <Empty className="max-w-md border bg-card/80 backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-destructive/15 text-destructive">
            <ShieldOffIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Your account is deactivated</EmptyTitle>
          <EmptyDescription>
            The admin has paused access for {profile.email}. Your records are safe — reach out to the admin to get
            access back.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </EmptyContent>
      </Empty>
    </main>
  );
}
