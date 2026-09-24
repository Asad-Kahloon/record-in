import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * RecordIn mark: a record ring with an arrow going in — money recorded as it
 * comes in. Drawn with strokes so it stays readable down to 16px.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-brand to-[#5a4bd1] text-brand-foreground shadow-[0_0_24px_-8px_var(--brand)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[62%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v6.5" />
        <path d="m8.75 10.75 3.25 3.25 3.25-3.25" />
      </svg>
    </span>
  );
}

export function Brand({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span className="text-base font-semibold tracking-tight">
        Record<span className="text-brand">In</span>
      </span>
    </span>
  );
}

