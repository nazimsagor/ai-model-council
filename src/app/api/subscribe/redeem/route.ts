import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/subscription";
import { redeemFreeCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json()) as { code?: string };
  const code = body.code?.trim() ?? "";
  if (!code) return NextResponse.json({ error: "Enter a code." }, { status: 400 });

  const result = await redeemFreeCoupon(user.id, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
