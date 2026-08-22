import { NextResponse } from "next/server";
import { confirmAndActivate } from "@/lib/payments";

export const runtime = "nodejs";

/** SSLCommerz's server-to-server callback — the authoritative activation
 *  path. The browser-facing /success redirect also confirms, for instant
 *  UI feedback, but this is the one that can't be skipped by a closed tab
 *  or a flaky redirect. */
export async function POST(req: Request) {
  const form = await req.formData();
  const tran_id = form.get("tran_id")?.toString();
  const val_id = form.get("val_id")?.toString();
  const status = form.get("status")?.toString();

  if (!tran_id || !val_id || status !== "VALID") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ok = await confirmAndActivate(tran_id, val_id);
  return NextResponse.json({ ok });
}
