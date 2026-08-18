import { supabase } from "../supabase";
import type {
  Benchmark,
  BenchmarkModelAggregate,
  BenchmarkModelResult,
  BenchmarkQuestion,
  BenchmarkQuestionResult,
  BenchmarkRun,
  BenchmarkSummary,
  EvaluationScores,
} from "../types";

export async function createBenchmark(visitorId: string, name: string, questionPrompts: string[]): Promise<string> {
  const { data: benchmark, error } = await supabase
    .from("benchmarks")
    .insert({ visitor_id: visitorId, name })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create benchmark: ${error.message}`);

  const rows = questionPrompts.map((prompt, i) => ({
    benchmark_id: benchmark.id as string,
    prompt,
    position: i,
  }));
  const { error: qError } = await supabase.from("benchmark_questions").insert(rows);
  if (qError) throw new Error(`Failed to create benchmark questions: ${qError.message}`);

  return benchmark.id as string;
}

export async function deleteBenchmark(benchmarkId: string, visitorId: string) {
  const { error } = await supabase.from("benchmarks").delete().eq("id", benchmarkId).eq("visitor_id", visitorId);
  if (error) throw new Error(`Failed to delete benchmark: ${error.message}`);
}

interface BenchmarkRow {
  id: string;
  name: string;
  created_at: string;
}

export async function listBenchmarks(visitorId: string): Promise<BenchmarkSummary[]> {
  const { data: benchmarks, error } = await supabase
    .from("benchmarks")
    .select("id, name, created_at")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .returns<BenchmarkRow[]>();
  if (error) throw new Error(`Failed to list benchmarks: ${error.message}`);
  if (!benchmarks || benchmarks.length === 0) return [];

  const ids = benchmarks.map((b) => b.id);
  const [{ data: questionCounts }, { data: lastRuns }] = await Promise.all([
    supabase.from("benchmark_questions").select("benchmark_id").in("benchmark_id", ids).returns<{ benchmark_id: string }[]>(),
    supabase
      .from("benchmark_runs")
      .select("benchmark_id, created_at, model_ids")
      .in("benchmark_id", ids)
      .order("created_at", { ascending: false })
      .returns<{ benchmark_id: string; created_at: string; model_ids: string[] }[]>(),
  ]);

  const countByBenchmark = new Map<string, number>();
  for (const row of questionCounts ?? []) {
    countByBenchmark.set(row.benchmark_id, (countByBenchmark.get(row.benchmark_id) ?? 0) + 1);
  }
  const lastRunByBenchmark = new Map<string, { created_at: string; model_ids: string[] }>();
  for (const row of lastRuns ?? []) {
    if (!lastRunByBenchmark.has(row.benchmark_id)) lastRunByBenchmark.set(row.benchmark_id, row);
  }

  return benchmarks.map((b) => ({
    id: b.id,
    name: b.name,
    createdAt: b.created_at,
    questionCount: countByBenchmark.get(b.id) ?? 0,
    lastRunAt: lastRunByBenchmark.get(b.id)?.created_at,
    lastRunModelCount: lastRunByBenchmark.get(b.id)?.model_ids.length,
  }));
}

interface QuestionRow {
  id: string;
  prompt: string;
  position: number;
}

interface RunRow {
  id: string;
  model_ids: string[];
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface ResultRow {
  question_id: string;
  model_id: string;
  provider: string;
  status: string;
  content: string | null;
  error: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  latency_ms: number;
  scores_json: EvaluationScores | null;
  total: number | null;
}

function buildAggregates(modelIds: string[], results: ResultRow[]): BenchmarkModelAggregate[] {
  return modelIds.map((modelId) => {
    const rows = results.filter((r) => r.model_id === modelId);
    const answered = rows.filter((r) => r.status === "complete");
    const failed = rows.filter((r) => r.status !== "complete");
    const scored = answered.filter((r) => r.scores_json);
    const avg = (pick: (r: ResultRow) => number) =>
      scored.length > 0 ? scored.reduce((sum, r) => sum + pick(r), 0) / scored.length : 0;

    return {
      modelId,
      provider: rows[0]?.provider ?? modelId.split("/")[0],
      questionsAnswered: answered.length,
      questionsFailed: failed.length,
      avgAccuracy: Math.round(avg((r) => r.scores_json!.accuracy) * 10) / 10,
      avgReasoning: Math.round(avg((r) => r.scores_json!.reasoning) * 10) / 10,
      avgLatencyMs: answered.length > 0 ? Math.round(answered.reduce((s, r) => s + r.latency_ms, 0) / answered.length) : 0,
      totalCost: Math.round(rows.reduce((s, r) => s + r.cost, 0) * 100000) / 100000,
      overallScore: scored.length > 0 ? Math.round((scored.reduce((s, r) => s + (r.total ?? 0), 0) / scored.length) * 10) / 10 : 0,
    };
  });
}

export async function getBenchmark(benchmarkId: string, visitorId: string): Promise<Benchmark | null> {
  const { data: benchmark, error } = await supabase
    .from("benchmarks")
    .select("id, name, created_at")
    .eq("id", benchmarkId)
    .eq("visitor_id", visitorId)
    .maybeSingle<BenchmarkRow>();
  if (error) throw new Error(`Failed to load benchmark: ${error.message}`);
  if (!benchmark) return null;

  const { data: questions, error: qError } = await supabase
    .from("benchmark_questions")
    .select("id, prompt, position")
    .eq("benchmark_id", benchmarkId)
    .order("position", { ascending: true })
    .returns<QuestionRow[]>();
  if (qError) throw new Error(`Failed to load benchmark questions: ${qError.message}`);

  const { data: runs, error: rError } = await supabase
    .from("benchmark_runs")
    .select("id, model_ids, status, created_at, completed_at")
    .eq("benchmark_id", benchmarkId)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<RunRow[]>();
  if (rError) throw new Error(`Failed to load benchmark runs: ${rError.message}`);

  const questionList: BenchmarkQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    position: q.position,
  }));

  const latestRunRow = runs?.[0];
  let latestRun: BenchmarkRun | undefined;

  if (latestRunRow) {
    const { data: results, error: resError } = await supabase
      .from("benchmark_results")
      .select("*")
      .eq("benchmark_run_id", latestRunRow.id)
      .returns<ResultRow[]>();
    if (resError) throw new Error(`Failed to load benchmark results: ${resError.message}`);

    const rows = results ?? [];
    const questionResults: BenchmarkQuestionResult[] = questionList.map((q) => ({
      questionId: q.id,
      prompt: q.prompt,
      results: rows
        .filter((r) => r.question_id === q.id)
        .map(
          (r): BenchmarkModelResult => ({
            modelId: r.model_id,
            provider: r.provider,
            status: r.status as BenchmarkModelResult["status"],
            content: r.content ?? "",
            error: r.error ?? undefined,
            promptTokens: r.prompt_tokens,
            completionTokens: r.completion_tokens,
            cost: r.cost,
            latencyMs: r.latency_ms,
            scores: r.scores_json ?? undefined,
            total: r.total ?? undefined,
          })
        ),
    }));

    latestRun = {
      id: latestRunRow.id,
      modelIds: latestRunRow.model_ids,
      status: latestRunRow.status as BenchmarkRun["status"],
      createdAt: latestRunRow.created_at,
      completedAt: latestRunRow.completed_at ?? undefined,
      questionResults,
      aggregates: buildAggregates(latestRunRow.model_ids, rows),
    };
  }

  return {
    id: benchmark.id,
    name: benchmark.name,
    createdAt: benchmark.created_at,
    questions: questionList,
    latestRun,
  };
}

export async function createBenchmarkRun(benchmarkId: string, visitorId: string, modelIds: string[]): Promise<string> {
  const { data, error } = await supabase
    .from("benchmark_runs")
    .insert({ benchmark_id: benchmarkId, visitor_id: visitorId, model_ids: modelIds, status: "running" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create benchmark run: ${error.message}`);
  return data.id as string;
}

export async function saveBenchmarkResult(
  runId: string,
  questionId: string,
  result: BenchmarkModelResult
) {
  const { error } = await supabase.from("benchmark_results").insert({
    benchmark_run_id: runId,
    question_id: questionId,
    model_id: result.modelId,
    provider: result.provider,
    status: result.status,
    content: result.content ?? "",
    error: result.error ?? null,
    prompt_tokens: result.promptTokens ?? 0,
    completion_tokens: result.completionTokens ?? 0,
    cost: result.cost ?? 0,
    latency_ms: result.latencyMs ?? 0,
    scores_json: result.scores ?? null,
    total: result.total ?? null,
  });
  if (error) throw new Error(`Failed to save benchmark result: ${error.message}`);
}

export async function completeBenchmarkRun(runId: string, status: "complete" | "failed") {
  const { error } = await supabase
    .from("benchmark_runs")
    .update({ status, completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`Failed to complete benchmark run: ${error.message}`);
}
