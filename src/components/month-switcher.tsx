"use client";

import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { useAppConfig } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatMonth, monthsBetween, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function MonthSwitcher({
  month,
  min,
  max,
  className,
}: {
  month: string;
  min: string;
  max: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useAppConfig();
  const [pending, startTransition] = useTransition();

  const go = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === max) params.delete("month");
    else params.set("month", next);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  const months = monthsBetween(min, max).reverse();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => go(shiftMonth(month, -1))}
        disabled={month <= min || pending}
        aria-label="Previous month"
      >
        <ChevronLeftIcon />
      </Button>
      <Select value={month} onValueChange={go} disabled={pending}>
        <SelectTrigger className="min-w-44 flex-1 justify-center font-medium md:flex-none" aria-label="Choose month">
          {pending ? <Spinner /> : <CalendarDaysIcon className="text-muted-foreground" />}
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="center">
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {formatMonth(m, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => go(shiftMonth(month, 1))}
        disabled={month >= max || pending}
        aria-label="Next month"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
