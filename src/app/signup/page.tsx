import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
