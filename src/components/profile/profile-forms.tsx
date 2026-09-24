"use client";

import { LogOutIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions/account";
import { updatePasswordAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { useSignOut } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { FormState } from "@/lib/types";

function useToastResult(state: FormState) {
  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);
}

export function ProfileNameForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  useToastResult(state);

  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={!!state?.fieldErrors?.fullName}>
          <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="profile-name"
              name="fullName"
              defaultValue={state?.values?.fullName ?? defaultName}
              maxLength={80}
              autoComplete="name"
              required
              aria-invalid={!!state?.fieldErrors?.fullName || undefined}
              className="h-10 min-w-0 flex-1 rounded-xl"
            />
            <Button type="submit" className="h-10 rounded-xl" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save
            </Button>
          </div>
          <FieldError>{state?.fieldErrors?.fullName}</FieldError>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useToastResult(state);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action}>
      <FieldGroup>
        <Field data-invalid={!!state?.fieldErrors?.password}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <PasswordInput id="new-password" name="password" autoComplete="new-password" invalid={!!state?.fieldErrors?.password} />
          <FieldDescription>At least 8 characters with a letter and a number.</FieldDescription>
          <FieldError>{state?.fieldErrors?.password}</FieldError>
        </Field>
        <Field data-invalid={!!state?.fieldErrors?.confirmPassword}>
          <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
          <PasswordInput
            id="confirm-new-password"
            name="confirmPassword"
            autoComplete="new-password"
            invalid={!!state?.fieldErrors?.confirmPassword}
          />
          <FieldError>{state?.fieldErrors?.confirmPassword}</FieldError>
        </Field>
        <Button type="submit" className="h-10 w-fit rounded-xl" disabled={pending}>
          {pending ? <Spinner /> : null}
          Update password
        </Button>
      </FieldGroup>
    </form>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const { pending, signOut } = useSignOut();
  return (
    <Button variant="destructive" className={className} onClick={signOut} disabled={pending}>
      {pending ? <Spinner /> : <LogOutIcon />}
      Sign out
    </Button>
  );
}
