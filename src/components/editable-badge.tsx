"use client";

import { LockIcon, PencilLineIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Live countdown until an entry locks. `now` starts null to keep SSR and hydration identical. */
export function useEditWindow(editableUntil: string, canEdit: boolean) {
  const deadline = new Date(editableUntil).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    const update = () => setNow(Date.now());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [canEdit, deadline]);

  const msLeft = now === null ? null : Math.max(0, deadline - now);
  const editable = canEdit && (msLeft === null || msLeft > 0);
  return { editable, msLeft };
}

export function formatTimeLeft(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 1) return `${minutes}:${String(seconds).padStart(2, "0")}`;
  return `0:${String(seconds).padStart(2, "0")}`;
}

export function EditableBadge({
  editableUntil,
  canEdit,
  className,
}: {
  editableUntil: string;
  canEdit: boolean;
  className?: string;
}) {
  const { editable, msLeft } = useEditWindow(editableUntil, canEdit);

  if (editable) {
    return (
      <Badge variant="outline" className={cn("border-brand/30 bg-brand/10 text-brand tabular-nums", className)}>
        <PencilLineIcon />
        {msLeft === null ? "Editable" : formatTimeLeft(msLeft)}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={cn("text-muted-foreground", className)}>
      <LockIcon />
      Locked
    </Badge>
  );
}
