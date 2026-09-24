import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;

  return (
    <AuthShell>
      <LoginForm next={safeNextPath(typeof next === "string" ? next : undefined)} />
    </AuthShell>
  );
}
