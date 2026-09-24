"use client";

import { Clock3Icon, LockIcon } from "lucide-react";

import { useAppConfig } from "@/components/providers/app-config";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";

const SKIP_REMINDER_KEY = "ledger:skip-lock-reminder";

export function shouldShowLockReminder(): boolean {
  try {
    return window.localStorage.getItem(SKIP_REMINDER_KEY) !== "1";
  } catch {
    return true;
  }
}

export function rememberSkipLockReminder() {
  try {
    window.localStorage.setItem(SKIP_REMINDER_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode); the reminder will simply show again.
  }
}

/** Inline hint shown in add forms. */
export function LockHint({ noun }: { noun: string }) {
  const { editWindowMinutes } = useAppConfig();
  return (
    <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
      <Clock3Icon className="mt-px size-3.5 shrink-0 text-brand" />
      <span>
        You can edit or delete this {noun} for <strong className="text-foreground">{editWindowMinutes} minutes</strong>{" "}
        after saving. After that it locks and can&apos;t be changed.
      </span>
    </p>
  );
}

/** Second step of the add flow: make the edit window explicit before saving. */
export function LockConfirm({
  noun,
  summary,
  pending,
  dontRemind,
  onDontRemindChange,
  onBack,
  onConfirm,
}: {
  noun: string;
  summary: React.ReactNode;
  pending: boolean;
  dontRemind: boolean;
  onDontRemindChange: (value: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { editWindowMinutes } = useAppConfig();

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex flex-col items-center gap-3 pt-1 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/25">
          <Clock3Icon className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight">Editable for {editWindowMinutes} minutes</h3>
          <p className="mx-auto max-w-sm text-sm text-balance text-muted-foreground">
            After you save, you can edit or delete this {noun} for the next {editWindowMinutes} minutes. Once that time
            is up it&apos;s locked for good.
          </p>
        </div>
      </div>

      {summary}

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
        <Checkbox checked={dontRemind} onCheckedChange={(value) => onDontRemindChange(value === true)} />
        Don&apos;t show this reminder again on this device
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onBack} disabled={pending}>
          Go back
        </Button>
        <Button type="button" className="h-11 rounded-xl" onClick={onConfirm} disabled={pending}>
          {pending ? <Spinner /> : <LockIcon />}
          Got it, save
        </Button>
      </div>
    </div>
  );
}
