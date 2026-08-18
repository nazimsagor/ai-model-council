import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/authServer";

export const runtime = "nodejs";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNext(req.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Google sign-in failed.")}`, req.url));
}
