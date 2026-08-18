import { chatCompletion } from "../openrouter";
import { extractJson } from "./json";
import {
  EVALUATION_DIMENSIONS,
  type EvaluationScores,
  type ModelEvaluation,
  type ModelRunResult,
  type OpenRouterModel,
} from "../types";

/** Picks judge models, preferring strong models that are NOT part of the
 *  council being evaluated (so a model never judges itself), and preferring
 *  provider diversity when multiple judges are requested.
 *
 *  Scoring prefers real current OpenRouter usage (`trendingIds`, ordered
 *  most- to least-used this week) over any hardcoded list of model names —
 *  a hardcoded "flagship" list inevitably goes stale as new models ship,
 *  which is exactly what happened here before. Reasoning/tool support from
 *  the live catalog is the tiebreak/fallback so this never goes stale again. */
export function selectJudges(
  catalog: OpenRouterModel[],
  councilModelIds: string[],
  count: number,
  trendingIds: string[] = []
): string[] {
  const excluded = new Set(councilModelIds);
  const candidates = catalog.filter((m) => !excluded.has(m.id));
  const trendRank = new Map(trendingIds.map((id, i) => [id, trendingIds.length - i]));

  const scored = candidates.map((model) => {
    let score = trendRank.get(model.id) ?? 0;
    score += model.capabilities.reasoning ? 3 : 0;
    score += model.capabilities.tools ? 1 : 0;
    score += Math.min(model.contextLength / 500_000, 2);
    return { model, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  const perProvider = new Map<string, number>();
  for (const { model, score } of scored) {
    if (selected.length >= count) break;
    if (score === 0 && selected.length > 0) continue; // avoid weak fallback unless we have nothing
    const used = perProvider.get(model.provider) ?? 0;
    if (used >= 1) continue; // one judge per provider for max diversity
    selected.push(model.id);
    perProvider.set(model.provider, used + 1);
  }
  // Backfill if we still need more judges (e.g. small catalog).
  if (selected.length < count) {
    for (const { model } of scored) {
      if (selected.length >= count) break;
      if (!selected.includes(model.id)) selected.push(model.id);
    }
  }
  return selected;
}

interface BlindEntry {
  label: string; // "Response A", "Response B", ...
  modelId: string;
  content: string;
}

function buildBlindEntries(results: ModelRunResult[]): BlindEntry[] {
  const successful = results.filter((r) => r.status === "complete" && r.content.trim());
  const shuffled = [...successful].sort(() => Math.random() - 0.5);
  return shuffled.map((r, i) => ({
    label: `Response ${String.fromCharCode(65 + i)}`,
    modelId: r.modelId,
    content: r.content,
  }));
}

const DIMENSION_LABELS: Record<keyof EvaluationScores, string> = {
  accuracy: "accuracy",
  reasoning: "reasoning",
  completeness: "completeness",
  relevance: "relevance",
  clarity: "clarity",
  technicalCorrectness: "technicalCorrectness",
  factualReliability: "factualReliability",
  instructionFollowing: "instructionFollowing",
  usefulness: "usefulness",
  originality: "originality",
};

function buildJudgePrompt(prompt: string, entries: BlindEntry[]): string {
  const dims = EVALUATION_DIMENSIONS.map((d) => DIMENSION_LABELS[d]).join(", ");
  const responsesBlock = entries
    .map((e) => `### ${e.label}\n${e.content}`)
    .join("\n\n");

  return `You are an impartial AI response evaluator. You will score multiple anonymized AI responses to the same question. You do NOT know which model produced which response — evaluate purely on merit.

ORIGINAL QUESTION:
${prompt}

RESPONSES TO EVALUATE:
${responsesBlock}

For EACH response, score these dimensions from 0-10 (decimals allowed): ${dims}.
Also give a one-sentence justification per response.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "Response A": { "accuracy": 9.2, "reasoning": 8.9, "completeness": 8.6, "relevance": 9.0, "clarity": 9.5, "technicalCorrectness": 9.0, "factualReliability": 9.1, "instructionFollowing": 9.3, "usefulness": 9.1, "originality": 7.8, "justification": "..." },
  "Response B": { ... }
}`;
}

interface JudgeRawResult {
  judgeModelId: string;
  scoresByModelId: Map<string, { scores: EvaluationScores; justification: string }>;
}

async function runSingleJudge(
  apiKey: string,
  judgeModelId: string,
  prompt: string,
  entries: BlindEntry[],
  signal?: AbortSignal
): Promise<JudgeRawResult> {
  const judgePrompt = buildJudgePrompt(prompt, entries);
  const { content } = await chatCompletion(
    apiKey,
    judgeModelId,
    [
      { role: "system", content: "You are a rigorous, unbiased evaluation engine. Output strict JSON only." },
      { role: "user", content: judgePrompt },
    ],
    { temperature: 0.1, maxTokens: 2000, signal }
  );

  const parsed = extractJson(content, "Judge response") as Record<string, Partial<EvaluationScores> & { justification?: string }>;
  const map = new Map<string, { scores: EvaluationScores; justification: string }>();

  for (const entry of entries) {
    const raw = parsed[entry.label];
    if (!raw) continue;
    const scores = {} as EvaluationScores;
    for (const dim of EVALUATION_DIMENSIONS) {
      const val = raw[dim];
      scores[dim] = typeof val === "number" && !Number.isNaN(val) ? Math.max(0, Math.min(10, val)) : 5;
    }
    map.set(entry.modelId, { scores, justification: raw.justification ?? "" });
  }

  return { judgeModelId, scoresByModelId: map };
}

function averageScores(scoreList: EvaluationScores[]): EvaluationScores {
  const result = {} as EvaluationScores;
  for (const dim of EVALUATION_DIMENSIONS) {
    result[dim] = scoreList.reduce((sum, s) => sum + s[dim], 0) / scoreList.length;
  }
  return result;
}

function totalOf(scores: EvaluationScores): number {
  const avg = EVALUATION_DIMENSIONS.reduce((sum, d) => sum + scores[d], 0) / EVALUATION_DIMENSIONS.length;
  return Math.round(avg * 10 * 10) / 10; // 0-100 scale, 1 decimal
}

export interface JudgeOutcome {
  evaluations: ModelEvaluation[];
  judgesUsed: string[];
  judgesFailed: { judgeModelId: string; error: string }[];
}

/** Runs all judges in parallel (failure-isolated), aggregates per-model scores
 *  while excluding a judge's own self-evaluation to reduce self-bias, and
 *  returns final ModelEvaluation entries. */
export async function evaluateResponses(
  apiKey: string,
  prompt: string,
  results: ModelRunResult[],
  judgeModelIds: string[],
  timeoutMs = 45_000
): Promise<JudgeOutcome> {
  const entries = buildBlindEntries(results);
  if (entries.length === 0) {
    return { evaluations: [], judgesUsed: [], judgesFailed: [] };
  }

  const outcomes = await Promise.allSettled(
    judgeModelIds.map((judgeId) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return runSingleJudge(apiKey, judgeId, prompt, entries, controller.signal).finally(() => clearTimeout(timer));
    })
  );

  const judgesUsed: string[] = [];
  const judgesFailed: { judgeModelId: string; error: string }[] = [];
  const successfulRuns: JudgeRawResult[] = [];

  outcomes.forEach((outcome, i) => {
    const judgeId = judgeModelIds[i];
    if (outcome.status === "fulfilled") {
      judgesUsed.push(judgeId);
      successfulRuns.push(outcome.value);
    } else {
      judgesFailed.push({ judgeModelId: judgeId, error: String(outcome.reason?.message ?? outcome.reason) });
    }
  });

  const evaluations: ModelEvaluation[] = entries.map((entry) => {
    // Exclude a judge from scoring its own output.
    const contributingRuns = successfulRuns.filter((run) => run.judgeModelId !== entry.modelId && run.scoresByModelId.has(entry.modelId));
    const runsToUse = contributingRuns.length > 0 ? contributingRuns : successfulRuns.filter((run) => run.scoresByModelId.has(entry.modelId));

    const scoreEntries = runsToUse.map((run) => run.scoresByModelId.get(entry.modelId)!);
    const scores = scoreEntries.length > 0 ? averageScores(scoreEntries.map((s) => s.scores)) : averageScores([defaultScores()]);
    const justification = scoreEntries.map((s) => s.justification).filter(Boolean).join(" ");

    return {
      modelId: entry.modelId,
      judgeModelId: runsToUse.map((r) => r.judgeModelId).join(" + ") || "none",
      scores,
      total: totalOf(scores),
      justification: justification || "No justification provided.",
    };
  });

  return { evaluations, judgesUsed, judgesFailed };
}

function defaultScores(): EvaluationScores {
  const s = {} as EvaluationScores;
  for (const dim of EVALUATION_DIMENSIONS) s[dim] = 5;
  return s;
}
