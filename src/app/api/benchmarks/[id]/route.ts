import { NextRequest, NextResponse } from "next/server";
import { deleteBenchmark, getBenchmark } from "@/lib/benchmarks/repository";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const benchmark = await getBenchmark(id, userId);
  if (!benchmark) return NextResponse.json({ error: "Benchmark not found" }, { status: 404 });
  return NextResponse.json({ benchmark });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  await deleteBenchmark(id, userId);
  return NextResponse.json({ ok: true });
}
