import { NextRequest, NextResponse } from "next/server";
import { createBenchmarkRun, getBenchmark } from "@/lib/benchmarks/repository";
import { executeBenchmarkRun } from "@/lib/benchmarks/run";
import { getVisitorId } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RunBody {
  modelIds?: string[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await getVisitorId();

  const apiKey = req.headers.get("x-openrouter-key")?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Add your OpenRouter API key first." }, { status: 401 });
  }

  const body = (await req.json()) as RunBody;
  const modelIds = (body.modelIds ?? []).filter(Boolean);
  if (modelIds.length < 2) {
    return NextResponse.json({ error: "Select at least 2 models to compare." }, { status: 400 });
  }
  if (modelIds.length > 7) {
    return NextResponse.json({ error: "Choose 7 models or fewer per run." }, { status: 400 });
  }

  const benchmark = await getBenchmark(id, visitorId);
  if (!benchmark) return NextResponse.json({ error: "Benchmark not found" }, { status: 404 });
  if (benchmark.questions.length === 0) {
    return NextResponse.json({ error: "This benchmark has no questions yet." }, { status: 400 });
  }

  const runId = await createBenchmarkRun(id, visitorId, modelIds);
  await executeBenchmarkRun(runId, apiKey, benchmark.questions, modelIds);

  const updated = await getBenchmark(id, visitorId);
  return NextResponse.json({ benchmark: updated });
}
