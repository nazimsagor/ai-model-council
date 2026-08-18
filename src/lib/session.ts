import { getCurrentUserId } from "@/lib/supabase/authServer";

/** The signed-in user's id, used to scope all persisted data (runs, history).
 *  Middleware guarantees every request under the (app) route group is
 *  authenticated, so this should never be null there — API routes still
 *  check explicitly and return 401 rather than assume. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
