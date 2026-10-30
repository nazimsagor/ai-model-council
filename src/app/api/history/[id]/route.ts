import { NextRequest, NextResponse } from "next/server";
import { deleteRun, getRun } from "@/lib/repository";
import { getRunOwner } from "@/lib/runOwner";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getRunOwner();
  if (!owner) return NextResponse.json({ error: "Sign in to view this run." }, { status: 401 });
  const run = await getRun(id, owner);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ run });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getRunOwner();
  if (!owner) return NextResponse.json({ error: "Sign in to delete this run." }, { status: 401 });
  await deleteRun(id, owner);
  return NextResponse.json({ ok: true });
}
