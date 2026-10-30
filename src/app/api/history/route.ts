import { NextResponse } from "next/server";
import { listRuns } from "@/lib/repository";
import { getRunOwner } from "@/lib/runOwner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await getRunOwner();
  // Browsing is open to everyone, so a signed-out visitor just sees an
  // empty history — not an error — matching how the rest of the site
  // behaves when signed out.
  if (!owner) return NextResponse.json({ runs: [] });
  const runs = await listRuns(owner, 100);
  return NextResponse.json({ runs });
}
