import { NextResponse } from "next/server";
import { confirmAndActivate } from "@/lib/payments";

export const runtime = "nodejs";

/** SSLCommerz POSTs here after a successful payment (browser redirect, not
 *  server-to-server — see /api/subscribe/ipn for the authoritative path).
 *  Confirms too, so the UI can show "subscribed" immediately instead of
 *  waiting on the IPN callback to land. */
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const form = await req.formData();
  const tran_id = form.get("tran_id")?.toString();
  const val_id = form.get("val_id")?.toString();

  if (tran_id && val_id) {
    await confirmAndActivate(tran_id, val_id);
  }

  return NextResponse.redirect(`${origin}/subscribe?status=success`, 303);
}
