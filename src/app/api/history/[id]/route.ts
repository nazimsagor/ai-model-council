import { NextRequest, NextResponse } from "next/server";
import { deleteRun, getRun } from "@/lib/repository";
import { getCurrentUser } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view this run." }, { status: 401 });
  const run = await getRun(id, user.id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ run });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete this run." }, { status: 401 });
  await deleteRun(id, user.id);
  return NextResponse.json({ ok: true });
}
