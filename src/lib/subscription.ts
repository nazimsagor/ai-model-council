import { supabase } from "./supabase";
import { createSupabaseServerClient } from "./supabase/authServer";

export interface CurrentUser {
  id: string;
  email: string | null;
  isSubscribed: boolean;
}

/** Creates a profiles row on first sign-in (no-op if it already exists). */
export async function ensureProfile(userId: string, email: string | null): Promise<void> {
  await supabase.from("profiles").upsert({ id: userId, email }, { onConflict: "id", ignoreDuplicates: true });
}

/** Reads the current auth session (if any) plus that user's subscription
 *  status. Returns null when signed out — callers gate on that, the proxy
 *  gate already redirects signed-out visitors to /login before they reach
 *  most pages, but API routes and edge cases still need this check. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("is_subscribed").eq("id", user.id).single();

  return {
    id: user.id,
    email: user.email ?? null,
    isSubscribed: profile?.is_subscribed ?? false,
  };
}
