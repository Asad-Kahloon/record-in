"use client";

import { ArrowLeftIcon, CircleAlertIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction, updatePasswordAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ForgotPasswordForm({ expired }: { expired?: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <Empty className="border bg-card/60 backdrop-blur">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-brand/15 text-brand">
            <MailCheckIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Check your email</EmptyTitle>
          <EmptyDescription>{state.success}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/login">
          <ArrowLeftIcon />
          Sign in
        </Link>
      </Button>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a link to set a new one.</p>
      </div>
      <form action={action} noValidate>
        <FieldGroup>
          {expired ? (
            <Alert>
              <CircleAlertIcon />
              <AlertTitle>That reset link has expired. Request a new one below.</AlertTitle>
            </Alert>
          ) : null}
          {state?.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{state.error}</AlertTitle>
            </Alert>
          ) : null}
          <Field data-invalid={!!state?.fieldErrors?.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={state?.values?.email}
              required
              aria-invalid={!!state?.fieldErrors?.email || undefined}
              className="h-11 rounded-xl"
            />
            <FieldError>{state?.fieldErrors?.email}</FieldError>
          </Field>
          <Button type="submit" className="h-11 rounded-xl text-base" disabled={pending}>
            {pending ? <Spinner /> : null}
            Send reset link
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}

export function ResetPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(updatePasswordAction, undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">For {email}</p>
      </div>
      <form action={action} noValidate>
        <input type="hidden" name="then" value="dashboard" />
        <FieldGroup>
          {state?.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{state.error}</AlertTitle>
            </Alert>
          ) : null}
          <Field data-invalid={!!state?.fieldErrors?.password}>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!state?.fieldErrors?.password} />
            <FieldDescription>At least 8 characters with a letter and a number.</FieldDescription>
            <FieldError>{state?.fieldErrors?.password}</FieldError>
          </Field>
          <Field data-invalid={!!state?.fieldErrors?.confirmPassword}>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              invalid={!!state?.fieldErrors?.confirmPassword}
            />
            <FieldError>{state?.fieldErrors?.confirmPassword}</FieldError>
          </Field>
          <Button type="submit" className="h-11 rounded-xl text-base" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save password
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
