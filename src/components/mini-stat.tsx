import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONES = {
  income: "bg-income",
  expense: "bg-expense",
  brand: "bg-brand",
} as const;

export function MiniStat({
  label,
  value,
  tone,
  hint,
  plain = false,
  className,
}: {
  label: string;
  value: string;
  tone?: keyof typeof TONES;
  hint?: string;
  /** Counts and labels that shouldn't blur in privacy mode. */
  plain?: boolean;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("gap-1", className)}>
      <CardHeader className="gap-1">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          {tone ? <span className={cn("size-2 shrink-0 rounded-full", TONES[tone])} /> : null}
          <span className="truncate">{label}</span>
        </CardDescription>
        <CardTitle className={cn("truncate text-base font-semibold tracking-tight sm:text-xl", !plain && "money")}>{value}</CardTitle>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}
