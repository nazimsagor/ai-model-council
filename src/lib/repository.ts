import { supabase } from "./supabase";
import type {
  CouncilRun,
  CouncilRunSummary,
  ModelEvaluation,
  ModelRunResult,
} from "./types";

export async function createRun(input: {
  userId: string;
  prompt: string;
  systemPrompt?: string;
  workflow: string;
  mode: string;
  promptMode: string;
  params: { temperature: number; maxTokens: number };
  selectedModelIds: string[];
  judgeModelIds: string[];
  blindJudging: boolean;
  parentRunId?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("runs")
    .insert({
      user_id: input.userId,
      prompt: input.prompt,
      system_prompt: input.systemPrompt ?? null,
      workflow: input.workflow,
      mode: input.mode,
      prompt_mode: input.promptMode,
      params: input.params,
      selected_model_ids: input.selectedModelIds,
      judge_model_ids: input.judgeModelIds,
      blind_judging: input.blindJudging,
      status: "running",
      parent_run_id: input.parentRunId ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create run: ${error.message}`);
  return data.id as string;
}

export async function saveModelResponse(runId: string, result: ModelRunResult) {
  const { error } = await supabase.from("model_responses").insert({
    run_id: runId,
    model_id: result.modelId,
    provider: result.provider,
    status: result.status,
    content: result.content ?? "",
    error: result.error ?? null,
    prompt_tokens: result.promptTokens ?? 0,
    completion_tokens: result.completionTokens ?? 0,
    cost: result.cost ?? 0,
    latency_ms: result.latencyMs ?? 0,
  });
  if (error) throw new Error(`Failed to save model response: ${error.message}`);
}

export async function saveEvaluation(runId: string, evaluation: ModelEvaluation) {
  const { error } = await supabase.from("evaluations").insert({
    run_id: runId,
    model_id: evaluation.modelId,
    judge_model_id: evaluation.judgeModelId,
    scores_json: evaluation.scores,
    total: evaluation.total,
    justification: evaluation.justification,
  });
  if (error) throw new Error(`Failed to save evaluation: ${error.message}`);
}

export async function completeRun(
  runId: string,
  data: { totalCost: number; totalTimeMs: number; summary?: CouncilRunSummary }
) {
  const { error } = await supabase
    .from("runs")
    .update({
      status: "complete",
      completed_at: new Date().toISOString(),
      total_cost: data.totalCost,
      total_time_ms: data.totalTimeMs,
      final_answer: data.summary?.finalAnswer ?? null,
      summary_json: data.summary ?? null,
    })
    .eq("id", runId);
  if (error) throw new Error(`Failed to complete run: ${error.message}`);
}

export async function failRun(runId: string) {
  const { error } = await supabase
    .from("runs")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`Failed to mark run failed: ${error.message}`);
}

interface RunRow {
  id: string;
  prompt: string;
  system_prompt: string | null;
  workflow: string;
  mode: string;
  prompt_mode: string;
  params: { temperature: number; maxTokens: number };
  selected_model_ids: string[];
  judge_model_ids: string[];
  blind_judging: boolean;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_cost: number;
  total_time_ms: number;
  summary_json: CouncilRunSummary | null;
}

interface ModelResponseRow {
  model_id: string;
  provider: string;
  status: string;
  content: string;
  error: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  latency_ms: number;
}

interface EvaluationRow {
  model_id: string;
  judge_model_id: string;
  scores_json: ModelEvaluation["scores"];
  total: number;
  justification: string;
}

/** Returns the run only if it belongs to this user. */
export async function getRun(runId: string, userId: string): Promise<CouncilRun | null> {
  const { data: row, error } = await supabase
    .from("runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle<RunRow>();

  if (error) throw new Error(`Failed to load run: ${error.message}`);
  if (!row) return null;

  const [{ data: responses, error: respError }, { data: evaluations, error: evalError }] = await Promise.all([
    supabase.from("model_responses").select("*").eq("run_id", runId).returns<ModelResponseRow[]>(),
    supabase.from("evaluations").select("*").eq("run_id", runId).returns<EvaluationRow[]>(),
  ]);
  if (respError) throw new Error(`Failed to load model responses: ${respError.message}`);
  if (evalError) throw new Error(`Failed to load evaluations: ${evalError.message}`);

  return {
    id: row.id,
    prompt: row.prompt,
    systemPrompt: row.system_prompt ?? undefined,
    workflow: row.workflow as CouncilRun["workflow"],
    mode: row.mode as CouncilRun["mode"],
    promptMode: row.prompt_mode as CouncilRun["promptMode"],
    params: row.params,
    selectedModelIds: row.selected_model_ids,
    judgeModelIds: row.judge_model_ids,
    blindJudging: row.blind_judging,
    status: row.status as CouncilRun["status"],
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    totalCost: row.total_cost,
    totalTimeMs: row.total_time_ms,
    results: (responses ?? []).map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      status: r.status as ModelRunResult["status"],
      content: r.content,
      error: r.error ?? undefined,
      promptTokens: r.prompt_tokens,
      completionTokens: r.completion_tokens,
      cost: r.cost,
      latencyMs: r.latency_ms,
    })),
    evaluations: (evaluations ?? []).map((e) => ({
      modelId: e.model_id,
      judgeModelId: e.judge_model_id,
      scores: e.scores_json,
      total: e.total,
      justification: e.justification,
    })),
    summary: row.summary_json ?? undefined,
  };
}

export interface RunListItem {
  id: string;
  prompt: string;
  createdAt: string;
  status: string;
  workflow: string;
  modelCount: number;
  totalCost: number;
  topModelId?: string;
}

export async function listRuns(userId: string, limit = 50): Promise<RunListItem[]> {
  const { data, error } = await supabase
    .from("runs")
    .select("id, prompt, created_at, status, workflow, selected_model_ids, total_cost, summary_json")
    .eq("user_id", userId)
    // A run still mid-stream ("running") isn't a settled result yet — only
    // show it here once it resolves to complete or failed, so Recent
    // Work/History don't display a prompt before its chat has finished.
    .neq("status", "running")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      Pick<
        RunRow,
        "id" | "prompt" | "created_at" | "status" | "workflow" | "selected_model_ids" | "total_cost" | "summary_json"
      >[]
    >();

  if (error) throw new Error(`Failed to list runs: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    createdAt: row.created_at,
    status: row.status,
    workflow: row.workflow,
    modelCount: row.selected_model_ids.length,
    totalCost: row.total_cost,
    topModelId: row.summary_json?.topModelIds?.[0],
  }));
}

export async function deleteRun(runId: string, userId: string) {
  const { error } = await supabase.from("runs").delete().eq("id", runId).eq("user_id", userId);
  if (error) throw new Error(`Failed to delete run: ${error.message}`);
}
