import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-app-glow p-6">
      <Brand />
      <Empty className="max-w-md border bg-card/70 backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl">
            <CompassIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Page not found</EmptyTitle>
          <EmptyDescription>The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
