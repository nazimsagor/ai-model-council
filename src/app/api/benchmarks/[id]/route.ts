import { NextRequest, NextResponse } from "next/server";
import { deleteBenchmark, getBenchmark } from "@/lib/benchmarks/repository";
import { getVisitorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await getVisitorId();
  const benchmark = await getBenchmark(id, visitorId);
  if (!benchmark) return NextResponse.json({ error: "Benchmark not found" }, { status: 404 });
  return NextResponse.json({ benchmark });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await getVisitorId();
  await deleteBenchmark(id, visitorId);
  return NextResponse.json({ ok: true });
}
