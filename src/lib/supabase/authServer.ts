import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set (server-side only, never NEXT_PUBLIC_).");
}

/** Session-aware Supabase client for auth flows (sign in/up/out, getUser).
 *  Distinct from lib/supabase.ts, which is a session-less client used for
 *  data queries scoped by application-level user id, not by RLS/auth.uid(). */
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  return createServerClient(url!, key!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
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

/** Returns the signed-in user's id, or null. Middleware guarantees this is
 *  non-null for protected routes, but callers should still check. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCurrentUser() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
