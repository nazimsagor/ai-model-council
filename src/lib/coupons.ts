import { supabase } from "./supabase";

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: string };

/** Grants lifetime access directly, bypassing SSLCommerz entirely — only
 *  for 100%-off codes, which is what the "Redeem" panel is for. A
 *  partial-discount coupon would still need a real payment for the
 *  remainder, so it's rejected here rather than silently doing the wrong
 *  thing; that flow isn't built yet. */
export async function redeemFreeCoupon(userId: string, rawCode: string): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const { data: coupon } = await supabase.from("coupons").select("*").eq("code", code).single();
  if (!coupon || !coupon.active) return { ok: false, error: "Invalid or expired code." };
  if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) {
    return { ok: false, error: "This code has already been fully redeemed." };
  }
  if (coupon.percent_off !== 100) {
    return { ok: false, error: "This code gives a discount at checkout, not free access." };
  }

  const { data: existing } = await supabase.from("profiles").select("is_subscribed").eq("id", userId).single();
  if (existing?.is_subscribed) return { ok: false, error: "You already have lifetime access." };

  const tran_id = `coupon_${code}_${userId.slice(0, 8)}_${Date.now()}`;
  const { error: paymentError } = await supabase.from("payments").insert({
    user_id: userId,
    tran_id,
    amount: 0,
    status: "valid",
    coupon_code: code,
  });
  if (paymentError) return { ok: false, error: "Could not redeem right now — try again." };

  await supabase.from("profiles").update({ is_subscribed: true, subscription_expires_at: null }).eq("id", userId);
  await supabase
    .from("coupons")
    .update({ redemption_count: coupon.redemption_count + 1 })
    .eq("code", code);

  return { ok: true };
}
