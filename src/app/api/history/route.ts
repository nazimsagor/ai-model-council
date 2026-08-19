import { NextResponse } from "next/server";
import { listRuns } from "@/lib/repository";
import { getCurrentUser } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  // Browsing is open to everyone, so a signed-out visitor just sees an
  // empty history — not an error — matching how the rest of the site
  // behaves when signed out.
  if (!user) return NextResponse.json({ runs: [] });
  const runs = await listRuns(user.id, 100);
  return NextResponse.json({ runs });
}
