import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Plain link to the CSV export route; the browser handles the download. */
export function DownloadButton({
  href,
  label = "Export CSV",
  variant = "outline",
  className,
}: {
  href: string;
  label?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  className?: string;
}) {
  return (
    <Button asChild variant={variant} className={className}>
      <a href={href} download>
        <DownloadIcon />
        {label}
      </a>
    </Button>
  );
}
