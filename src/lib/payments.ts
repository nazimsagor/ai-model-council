import { supabase } from "./supabase";
import { validateTransaction } from "./sslcommerz";

/** Confirms a transaction with SSLCommerz and grants lifetime access.
 *  Called from both the IPN endpoint (authoritative, server-to-server) and
 *  the success redirect (same-browser, for instant UI feedback) — both
 *  paths funnel through here so activation is idempotent regardless of
 *  which one lands first. subscription_expires_at stays null: this is a
 *  one-time purchase, not a recurring plan, so there's nothing to expire. */
export async function confirmAndActivate(tran_id: string, val_id: string): Promise<boolean> {
  const { data: payment } = await supabase.from("payments").select("*").eq("tran_id", tran_id).single();
  if (!payment) return false;
  if (payment.status === "valid") return true; // already processed

  const result = await validateTransaction(val_id);
  if (!result.valid || result.tran_id !== tran_id || result.amount < Number(payment.amount)) {
    await supabase.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("tran_id", tran_id);
    return false;
  }

  await supabase
    .from("payments")
    .update({ status: "valid", val_id, card_type: result.card_type, updated_at: new Date().toISOString() })
    .eq("tran_id", tran_id);
  await supabase
    .from("profiles")
    .update({ is_subscribed: true, subscription_expires_at: null })
    .eq("id", payment.user_id);

  return true;
}

export async function markPaymentStatus(tran_id: string, status: "failed" | "cancelled") {
  await supabase.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("tran_id", tran_id);
}
