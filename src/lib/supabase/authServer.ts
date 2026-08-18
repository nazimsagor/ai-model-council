import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client bound to the request's cookies — reads the
 *  current auth session and (where called from a Route Handler or Server
 *  Action) can refresh it. Cookie writes are silently skipped when called
 *  from a plain Server Component render, same pattern as getVisitorId().
 *
 *  Env vars are checked lazily, inside the function, not at module scope —
 *  a module-scope throw would fire the moment anything imports this file
 *  (including indirectly, e.g. during Next's build-time route analysis),
 *  which can take down the entire build/site if the vars are momentarily
 *  unset, rather than just the one request that actually needed auth. */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — cookies are read-only there.
        }
      },
    },
  });
}
