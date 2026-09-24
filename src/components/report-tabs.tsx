"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** URL-driven tabs: each tab is a link, so the server renders the matching data. */
export function ReportTabs({
  value,
  param = "view",
  options,
  className,
}: {
  value: string;
  param?: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === options[0]?.value) params.delete(param);
    else params.set(param, next);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <Tabs value={value} className={className}>
      <TabsList className="h-10! w-full md:w-fit">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value} asChild className="px-4">
            <Link href={hrefFor(option.value)} scroll={false}>
              {option.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
