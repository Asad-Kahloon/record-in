import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

// Google sign-in, email confirmation and password-reset links all land here
// with a one-time `code` that is exchanged for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base = env.appUrl ?? request.nextUrl.origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, base));

  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return go(`/auth/error?reason=${encodeURIComponent(providerError.slice(0, 200))}`);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return go(safeNextPath(searchParams.get("next")));
  }

  return go("/auth/error?reason=link");
}
