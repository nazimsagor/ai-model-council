import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Browsing is public — Chat/Compare/Council/Auto-route, Models, and
 *  Benchmarks all render without an account. Only actions that need to
 *  persist data (running a workflow, saving a benchmark, viewing your own
 *  history) require sign-in, enforced where that action happens rather
 *  than as a blanket site-wide gate.
 *
 *  This still has to run on (almost) every route, not just /login: calling
 *  getUser() here is what silently refreshes an expiring access token via
 *  its refresh token and writes the new cookies back to the response.
 *  Server Components can only *read* cookies, not write them, so without
 *  this running broadly, sessions would randomly drop once the access
 *  token expires. See Supabase's Next.js SSR guide. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") ? next : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // API routes enforce their own auth (returning JSON 401s) — redirecting
  // them to an HTML login page would break every fetch()/.json() call.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|icon).*)"],
};
