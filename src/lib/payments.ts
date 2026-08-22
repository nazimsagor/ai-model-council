import { supabase } from "./supabase";
import { validateTransaction } from "./sslcommerz";

const SUBSCRIPTION_DAYS = 30;

/** Confirms a transaction with SSLCommerz and activates the subscription.
 *  Called from both the IPN endpoint (authoritative, server-to-server) and
 *  the success redirect (same-browser, for instant UI feedback) — both
 *  paths funnel through here so activation is idempotent regardless of
 *  which one lands first. */
export async function confirmAndActivate(tran_id: string, val_id: string): Promise<boolean> {
  const { data: payment } = await supabase.from("payments").select("*").eq("tran_id", tran_id).single();
  if (!payment) return false;
  if (payment.status === "valid") return true; // already processed

  const result = await validateTransaction(val_id);
  if (!result.valid || result.tran_id !== tran_id || result.amount < Number(payment.amount)) {
    await supabase.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("tran_id", tran_id);
    return false;
  }

  const expiresAt = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("payments")
    .update({ status: "valid", val_id, card_type: result.card_type, updated_at: new Date().toISOString() })
    .eq("tran_id", tran_id);
  await supabase
    .from("profiles")
    .update({ is_subscribed: true, subscription_expires_at: expiresAt })
    .eq("id", payment.user_id);

  return true;
}

export async function markPaymentStatus(tran_id: string, status: "failed" | "cancelled") {
  await supabase.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("tran_id", tran_id);
}
