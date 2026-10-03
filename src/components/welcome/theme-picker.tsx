"use client";

import { CheckIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Each preview is drawn in its own theme's colors, whatever the screen shows now.
const PREVIEW: Record<Theme, { label: string; page: string; card: string; ink: string; faint: string }> = {
  light: { label: "Light", page: "#f6f6f9", card: "#ffffff", ink: "#16151d", faint: "rgb(22 21 40 / 0.12)" },
  dark: { label: "Dark", page: "#0a0a0d", card: "#17171b", ink: "#f4f4f6", faint: "rgb(255 255 255 / 0.12)" },
};

function Preview({ theme }: { theme: Theme }) {
  const c = PREVIEW[theme];
  return (
    <div aria-hidden className="w-full overflow-hidden rounded-xl p-2.5" style={{ background: c.page }}>
      <div
        className="rounded-lg p-2.5"
        style={{ background: "linear-gradient(135deg, #5b4bd6 0%, #4336b8 45%, #221c6b 100%)" }}
      >
        <div className="h-1.5 w-8 rounded-full bg-white/60" />
        <div className="mt-2 h-3 w-16 rounded-full bg-white" />
      </div>
      <div className="mt-2 space-y-1.5 rounded-lg p-2" style={{ background: c.card }}>
        {[["#199e70", "w-12"], ["#d95926", "w-9"], ["#3987e5", "w-14"]].map(([dot, width]) => (
          <div key={dot} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} />
            <span className={cn("h-1.5 rounded-full", width)} style={{ background: c.faint }} />
            <span className="ml-auto h-1.5 w-5 rounded-full" style={{ background: c.ink, opacity: 0.7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Light or dark, with a miniature of each. Choosing previews it on the spot. */
export function ThemePicker({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => isTheme(next) && onChange(next)}
      spacing={2}
      aria-label="Theme"
      className="grid w-full grid-cols-2 gap-3"
    >
      {(Object.keys(PREVIEW) as Theme[]).map((theme) => (
        <ToggleGroupItem
          key={theme}
          value={theme}
          className="group h-auto min-w-0 flex-col items-stretch gap-3 rounded-2xl border border-transparent bg-card p-3 ring-1 ring-foreground/10 hover:bg-muted data-[state=on]:border-brand/60 data-[state=on]:bg-brand/10"
        >
          <Preview theme={theme} />
          <span className="flex items-center justify-between px-1 text-sm font-semibold">
            {PREVIEW[theme].label}
            <span className="flex size-5 items-center justify-center rounded-full border border-foreground/20 group-data-[state=on]:border-brand group-data-[state=on]:bg-brand group-data-[state=on]:text-brand-foreground">
              <CheckIcon className="size-3 opacity-0 group-data-[state=on]:opacity-100" />
            </span>
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
