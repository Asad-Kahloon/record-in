"use client";

import { DownloadIcon, EllipsisVerticalIcon, EyeIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setUserActiveAction } from "@/app/actions/account";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { Role } from "@/lib/types";

export function UserActions({
  user,
  month,
  isSelf,
}: {
  user: { id: string; name: string; role: Role; is_active: boolean };
  month: string;
  isSelf: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const canToggle = !isSelf && user.role !== "superadmin";
  const exportBase = isSelf ? "/api/export?scope=me" : `/api/export?scope=user&user=${user.id}`;

  const toggle = () =>
    startTransition(async () => {
      const result = await setUserActiveAction(user.id, !user.is_active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      setConfirmOpen(false);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isSelf ? null : (
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}?month=${month}`}>
                <EyeIcon />
                View account
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={`${exportBase}&month=${month}`} download>
              <DownloadIcon />
              Download this month
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={exportBase} download>
              <DownloadIcon />
              Download all-time
            </a>
          </DropdownMenuItem>
          {canToggle ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant={user.is_active ? "destructive" : "default"}
                onSelect={() => setConfirmOpen(true)}
              >
                {user.is_active ? <UserXIcon /> : <UserCheckIcon />}
                {user.is_active ? "Deactivate account" : "Activate account"}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className={user.is_active ? "bg-destructive/15 text-destructive" : "bg-income/15 text-income"}>
              {user.is_active ? <UserXIcon /> : <UserCheckIcon />}
            </AlertDialogMedia>
            <AlertDialogTitle>{user.is_active ? `Deactivate ${user.name}?` : `Activate ${user.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {user.is_active
                ? "They won't be able to use the app until you activate them again. Their records stay safe."
                : "They'll be able to sign in and add entries again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={user.is_active ? "destructive" : "default"}
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                toggle();
              }}
            >
              {pending ? <Spinner /> : null}
              {user.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
