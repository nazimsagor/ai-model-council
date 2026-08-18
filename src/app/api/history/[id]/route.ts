import { NextRequest, NextResponse } from "next/server";
import { deleteRun, getRun } from "@/lib/repository";
import { getVisitorId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await getVisitorId();
  const run = await getRun(id, visitorId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ run });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await getVisitorId();
  await deleteRun(id, visitorId);
  return NextResponse.json({ ok: true });
}
