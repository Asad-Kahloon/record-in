"use client";

import { ChartColumnIcon, Table2Icon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ChartView = "chart" | "table";

/** Every chart has a table twin, so values are never hidden behind hover. */
export function ChartViewToggle({ value, onChange }: { value: ChartView; onChange: (view: ChartView) => void }) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      spacing={0}
      value={value}
      onValueChange={(next) => next && onChange(next as ChartView)}
      aria-label="Display as"
    >
      <ToggleGroupItem value="chart" aria-label="Chart view">
        <ChartColumnIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table view">
        <Table2Icon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
