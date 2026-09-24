"use client";

import { ArrowRightLeftIcon, CoinsIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setCurrencyAction } from "@/app/actions/account";
import { CurrencySelect } from "@/components/currency-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { currencyName } from "@/lib/currencies";

export function CurrencyCard({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await setCurrencyAction(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      setOpen(false);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className="size-4 text-muted-foreground" />
          Main currency
        </CardTitle>
        <CardDescription>
          Every total is shown in this currency. Amounts you add in other currencies are converted automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <CurrencySelect id="main-currency" value={value} onValueChange={setValue} className="sm:max-w-xs" />
        <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
          <AlertDialogTrigger asChild>
            <Button className="h-11 rounded-xl" disabled={value === current}>
              Change currency
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-brand/15 text-brand">
                <ArrowRightLeftIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Switch to {value}?</AlertDialogTitle>
              <AlertDialogDescription>
                All your income, expenses and debts will be shown in {currencyName(value)}, converted with today&apos;s
                exchange rates. The amounts you typed stay exactly as they are.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  save();
                }}
              >
                {pending ? <Spinner /> : null}
                Switch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
