import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { initSession } from "@/lib/sslcommerz";
import { LIFETIME_PRICE_BDT } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (user.isSubscribed) return NextResponse.json({ error: "You already have lifetime access." }, { status: 400 });

  const origin = new URL(req.url).origin;
  const tran_id = `amc_${user.id.slice(0, 8)}_${Date.now()}_${randomUUID().slice(0, 8)}`;

  const { error: insertError } = await supabase.from("payments").insert({
    user_id: user.id,
    tran_id,
    amount: LIFETIME_PRICE_BDT,
    status: "pending",
  });
  if (insertError) return NextResponse.json({ error: "Could not start payment" }, { status: 500 });

  try {
    const { GatewayPageURL } = await initSession({
      tran_id,
      amount: LIFETIME_PRICE_BDT,
      customerName: user.name || user.email || "Bohumot AI user",
      customerEmail: user.email || "no-email@example.com",
      successUrl: `${origin}/api/subscribe/success`,
      failUrl: `${origin}/api/subscribe/fail`,
      cancelUrl: `${origin}/api/subscribe/cancel`,
      ipnUrl: `${origin}/api/subscribe/ipn`,
    });
    return NextResponse.json({ url: GatewayPageURL });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Payment init failed" }, { status: 502 });
  }
}
