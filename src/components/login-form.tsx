"use client";

import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

export function LoginForm({ next, className }: { next: string; className?: string }) {
  const [state, action, pending] = useActionState(signInAction, undefined);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1.5 text-center md:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-balance text-muted-foreground">Sign in to see where your money went.</p>
      </div>

      <GoogleButton next={next} />

      <FieldSeparator>or with email</FieldSeparator>

      <form action={action} noValidate className="flex flex-col gap-6">
        <input type="hidden" name="next" value={next} />
        <FieldGroup>
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
          <Field data-invalid={!!state?.fieldErrors?.password}>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              invalid={!!state?.fieldErrors?.password}
            />
            <FieldError>{state?.fieldErrors?.password}</FieldError>
          </Field>
          <Field>
            <Button type="submit" className="h-11 rounded-xl text-base" disabled={pending}>
              {pending ? <Spinner /> : null}
              Sign in
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account? <Link href="/signup">Create one</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
