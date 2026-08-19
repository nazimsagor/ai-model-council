import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/subscription";

export const runtime = "nodejs";

/** Account-level OpenRouter key — set once, active on any device you sign
 *  into. Still sent per-request via the x-openrouter-key header and never
 *  touches OpenRouter/our own model-call logs; this just replaces
 *  browser-only localStorage as the source of truth once signed in. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data } = await supabase.from("profiles").select("openrouter_key").eq("id", user.id).single();
  return NextResponse.json({ key: data?.openrouter_key ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!user.isSubscribed) return NextResponse.json({ error: "Subscribe to add an API key." }, { status: 402 });

  const body = (await req.json()) as { key?: string };
  const key = body.key?.trim() || null;

  const { error } = await supabase.from("profiles").update({ openrouter_key: key }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Failed to save key" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
