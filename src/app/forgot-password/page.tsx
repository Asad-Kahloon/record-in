import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Reset password" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const { expired } = await searchParams;

  return (
    <AuthShell>
      <ForgotPasswordForm expired={expired === "1"} />
    </AuthShell>
  );
}
