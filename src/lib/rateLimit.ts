import { supabase } from "./supabase";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

/** Fixed-lookback rate limit: counts this key's requests in the last
 *  WINDOW_MS and rejects once MAX_REQUESTS is hit. Not perfectly atomic
 *  under heavy concurrent bursts from the same key (a classic
 *  check-then-insert race), but that's an acceptable tradeoff here — the
 *  goal is stopping runaway abuse/cost, not hard rate-limit precision. */
export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("request_log")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
  }

  await supabase.from("request_log").insert({ key });

  // Occasional opportunistic cleanup so this table doesn't grow forever —
  // no cron needed, just a small chance per call to sweep old rows.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("request_log").delete().lt("created_at", cutoff);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
