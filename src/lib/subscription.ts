import { supabase } from "./supabase";
import { createSupabaseServerClient } from "./supabase/authServer";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  isSubscribed: boolean;
  subscriptionExpiresAt: string | null;
}

/** Reads the current auth session (if any) plus that user's profile and
 *  subscription status. Returns null when signed out. The profiles row
 *  itself is created by a DB trigger (handle_new_user, on auth.users
 *  insert) rather than here — that covers every sign-up path (Google,
 *  GitHub, email/password) uniformly instead of relying on each auth flow
 *  remembering to call something after the fact.
 *
 *  Subscription status is derived from subscription_expires_at, not read
 *  off is_subscribed directly — that's what lets a subscription lapse on
 *  its own after 30 days with no cron job. is_subscribed is only consulted
 *  as a fallback for accounts granted a subscription before this column
 *  existed (expires_at null). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_subscribed, subscription_expires_at")
    .eq("id", user.id)
    .single();

  const expiresAt = profile?.subscription_expires_at ?? null;
  const isSubscribed = expiresAt ? new Date(expiresAt).getTime() > Date.now() : (profile?.is_subscribed ?? false);

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.name ?? null,
    isSubscribed,
    subscriptionExpiresAt: expiresAt,
  };
}
