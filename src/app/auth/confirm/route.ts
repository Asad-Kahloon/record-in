import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

// Optional: use this when the Supabase email templates link to
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...
// It works even if the link is opened on a different device than the sign-up.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base = env.appUrl ?? request.nextUrl.origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, base));

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return go(type === "recovery" ? "/reset-password" : safeNextPath(searchParams.get("next")));
    }
  }

  return go("/auth/error?reason=link");
}
