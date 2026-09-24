import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { getClaims } from "@/lib/data";

export const metadata: Metadata = { title: "New password" };

// Reached from the password-reset email, which signs the user in first.
export default async function ResetPasswordPage() {
  const claims = await getClaims();
  if (!claims) redirect("/forgot-password?expired=1");

  return (
    <AuthShell>
      <ResetPasswordForm email={typeof claims.email === "string" ? claims.email : "your account"} />
    </AuthShell>
  );
}
