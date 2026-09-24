"use client";

import { CheckIcon, CircleAlertIcon, CircleIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { signUpAction } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function SignupForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  const [password, setPassword] = useState("");

  // The form resets after each submit, so the checklist follows.
  useEffect(() => setPassword(""), [state]);

  if (state?.success) {
    return (
      <Empty className={cn("border bg-card/60 backdrop-blur", className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-brand/15 text-brand">
            <MailCheckIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Check your inbox</EmptyTitle>
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

  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "A letter", ok: /[A-Za-z]/.test(password) },
    { label: "A number", ok: /\d/.test(password) },
  ];

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1.5 text-center md:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-balance text-muted-foreground">Start tracking your income and expenses today.</p>
      </div>

      <GoogleButton label="Sign up with Google" />

      <FieldSeparator>or with email</FieldSeparator>

      <form action={action} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          {state?.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{state.error}</AlertTitle>
            </Alert>
          ) : null}
          <Field data-invalid={!!state?.fieldErrors?.fullName}>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              name="fullName"
              autoComplete="name"
              placeholder="Your name"
              maxLength={80}
              defaultValue={state?.values?.fullName}
              required
              aria-invalid={!!state?.fieldErrors?.fullName || undefined}
              className="h-11 rounded-xl"
            />
            <FieldError>{state?.fieldErrors?.fullName}</FieldError>
          </Field>
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
          <Field data-invalid={!!state?.fieldErrors?.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              invalid={!!state?.fieldErrors?.password}
              onValueChange={setPassword}
            />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
              {checks.map((check) => (
                <li
                  key={check.label}
                  className={cn("flex items-center gap-1", check.ok ? "text-positive" : "text-muted-foreground")}
                >
                  {check.ok ? <CheckIcon className="size-3" /> : <CircleIcon className="size-3" />}
                  {check.label}
                </li>
              ))}
            </ul>
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
          <Field>
            <Button type="submit" className="h-11 rounded-xl text-base" disabled={pending}>
              {pending ? <Spinner /> : null}
              Create account
            </Button>
            <FieldDescription className="text-center">
              Already have an account? <Link href="/login">Sign in</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
