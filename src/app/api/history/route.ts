import { NextResponse } from "next/server";
import { listRuns } from "@/lib/repository";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const runs = await listRuns(userId, 100);
  return NextResponse.json({ runs });
}
