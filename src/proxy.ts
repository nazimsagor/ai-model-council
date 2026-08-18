import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

// Google-login is required to use the app at all; Council/Compare are
// additionally gated behind a subscription (checked in the pages
// themselves, via lib/subscription.ts, since that needs a DB read).
export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Fail open, not closed: this runs on every request, so throwing here
    // would take the entire site down (not just the auth-gated parts) the
    // moment these env vars are unset — e.g. mid-deploy, before they're
    // configured on a new environment. Missing config should degrade to
    // "no login gate" for that request, not a hard 500 for every visitor.
    console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — skipping the auth gate.");
    return res;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) req.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) res.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.tsx).*)"],
};
