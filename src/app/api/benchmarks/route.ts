import { NextRequest, NextResponse } from "next/server";
import { createBenchmark, listBenchmarks } from "@/lib/benchmarks/repository";
import { getVisitorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const visitorId = await getVisitorId();
  const benchmarks = await listBenchmarks(visitorId);
  return NextResponse.json({ benchmarks });
}

interface CreateBody {
  name?: string;
  questions?: string[];
}

export async function POST(req: NextRequest) {
  const visitorId = await getVisitorId();

  const body = (await req.json()) as CreateBody;
  const name = body.name?.trim();
  const questions = (body.questions ?? []).map((q) => q.trim()).filter(Boolean);

  if (!name) return NextResponse.json({ error: "Benchmark name is required" }, { status: 400 });
  if (questions.length === 0) return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

  const id = await createBenchmark(visitorId, name, questions);
  return NextResponse.json({ id });
}
