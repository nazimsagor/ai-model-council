import { NextResponse } from "next/server";
import { listRuns } from "@/lib/repository";
import { getVisitorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const visitorId = await getVisitorId();
  const runs = await listRuns(visitorId, 100);
  return NextResponse.json({ runs });
}
