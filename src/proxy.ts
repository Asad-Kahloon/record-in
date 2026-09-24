import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes anyone can open. Everything else needs a signed-in user.
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/auth"];
// Signed-in users get bounced from these to the dashboard.
const GUEST_ONLY_ROUTES = ["/login", "/signup", "/forgot-password"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function originOf(url: string | undefined) {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  const supabaseOrigin = originOf(process.env.SUPABASE_URL);

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    // The browser only ever talks to this app. Supabase is reached from the server.
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${supabaseOrigin} https://accounts.google.com`.replace(/\s+/g, " ").trim(),
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const { pathname, search } = request.nextUrl;

  // Next.js reads the nonce from the request's CSP header and stamps it on its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const withSecurityHeaders = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // Not configured yet: let the page render so it can show the setup error.
    return withSecurityHeaders(response);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Verifies the JWT and refreshes an expired session. Keep this call directly
  // after creating the client.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const redirect = (path: string, rememberDestination = false) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (rememberDestination) url.searchParams.set("next", `${pathname}${search}`);
    const res = NextResponse.redirect(url);
    // Carry over any refreshed auth cookies.
    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
    return withSecurityHeaders(res);
  };

  if (!signedIn && !matchesRoute(pathname, PUBLIC_ROUTES)) {
    return redirect("/login", pathname !== "/" && pathname !== "/dashboard");
  }

  if (signedIn && matchesRoute(pathname, GUEST_ONLY_ROUTES)) {
    return redirect("/dashboard");
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|manifest.webmanifest|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
