import { NextResponse } from "next/server";
import { markPaymentStatus } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const form = await req.formData();
  const tran_id = form.get("tran_id")?.toString();
  if (tran_id) await markPaymentStatus(tran_id, "cancelled");
  return NextResponse.redirect(`${origin}/subscribe?status=cancel`, 303);
}
