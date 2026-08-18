import { NextRequest, NextResponse } from "next/server";
import { createBenchmark, listBenchmarks } from "@/lib/benchmarks/repository";
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
  const benchmarks = await listBenchmarks(userId);
  return NextResponse.json({ benchmarks });
}

interface CreateBody {
  name?: string;
  questions?: string[];
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await req.json()) as CreateBody;
  const name = body.name?.trim();
  const questions = (body.questions ?? []).map((q) => q.trim()).filter(Boolean);

  if (!name) return NextResponse.json({ error: "Benchmark name is required" }, { status: 400 });
  if (questions.length === 0) return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

  const id = await createBenchmark(userId, name, questions);
  return NextResponse.json({ id });
}
