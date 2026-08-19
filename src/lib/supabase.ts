import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
// Optional for now, but required once RLS is enabled on the app's tables:
// the anon key is subject to RLS like any other client, while the service
// role key bypasses it — appropriate here since this file is server-only
// (never bundled to the browser) and every read/write already goes through
// our own API routes, which enforce their own auth checks before touching
// the DB. Falls back to the anon key so the app keeps working, unmodified,
// until this is set — RLS must not be enabled on the underlying tables
// until it is, or every server-side query would start failing.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set (server-side only, never NEXT_PUBLIC_).");
}

export const supabase = createClient(url, serviceRoleKey || anonKey, {
  auth: { persistSession: false },
});
