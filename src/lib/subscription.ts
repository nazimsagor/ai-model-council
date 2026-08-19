import { supabase } from "./supabase";
import { createSupabaseServerClient } from "./supabase/authServer";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  isSubscribed: boolean;
}

/** Reads the current auth session (if any) plus that user's profile and
 *  subscription status. Returns null when signed out. The profiles row
 *  itself is created by a DB trigger (handle_new_user, on auth.users
 *  insert) rather than here — that covers every sign-up path (Google,
 *  GitHub, email/password) uniformly instead of relying on each auth flow
 *  remembering to call something after the fact. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("name, is_subscribed").eq("id", user.id).single();

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.name ?? null,
    isSubscribed: profile?.is_subscribed ?? false,
  };
}
