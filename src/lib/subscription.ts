import { supabase } from "./supabase";
import { createSupabaseServerClient } from "./supabase/authServer";
import { isAdminEmail } from "./adminAccess";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  isSubscribed: boolean;
  subscriptionExpiresAt: string | null;
  isAdmin: boolean;
}

/** Reads the current auth session (if any) plus that user's profile and
 *  subscription status. Returns null when signed out. The profiles row
 *  itself is created by a DB trigger (handle_new_user, on auth.users
 *  insert) rather than here — that covers every sign-up path (Google,
 *  GitHub, email/password) uniformly instead of relying on each auth flow
 *  remembering to call something after the fact.
 *
 *  Access is a one-time lifetime purchase, not a recurring plan: a grant
 *  (paid or via a free coupon) sets is_subscribed true and leaves
 *  subscription_expires_at null forever, which is what "lifetime" means
 *  here. expires_at only matters if it's ever set to a real date — kept
 *  around in case a time-limited grant is needed later — in which case it
 *  overrides is_subscribed once it's in the past. */
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
    isAdmin: isAdminEmail(user.email),
  };
}
