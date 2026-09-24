import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
        className="size-[55%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19h16" />
        <path d="M6 15l4-4 3 3 5-6" />
      </svg>
    </span>
  );
}

export function Brand({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  );
}
