import { chatCompletion, estimateCost, listModels } from "../openrouter";
import { evaluateResponses, selectJudges } from "../council/evaluation";
import type { BenchmarkQuestion, BenchmarkModelResult, ModelRunResult, OpenRouterModel } from "../types";
import { completeBenchmarkRun, saveBenchmarkResult } from "./repository";

const PER_CALL_TIMEOUT_MS = 60_000;

async function runOneModel(
  apiKey: string,
  model: OpenRouterModel,
  prompt: string
): Promise<ModelRunResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CALL_TIMEOUT_MS);
  const started = Date.now();
  try {
    const result = await chatCompletion(
      apiKey,
      model.id,
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 1024, signal: controller.signal }
    );
    return {
      modelId: model.id,
      provider: model.provider,
      status: "complete",
      content: result.content,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      cost: estimateCost(model, result.promptTokens, result.completionTokens),
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      modelId: model.id,
      provider: model.provider,
      status: "failed",
      content: "",
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Runs every (question, model) pair in parallel, then blind-judges each
 *  question's answers, persisting results as they land. A failed model or
 *  a failed judge never blocks the rest of the benchmark. */
export async function executeBenchmarkRun(
  runId: string,
  apiKey: string,
  questions: BenchmarkQuestion[],
  modelIds: string[]
): Promise<void> {
  const catalog = await listModels();
  const modelsById = new Map(catalog.map((m) => [m.id, m]));
  const models = modelIds.map((id) => modelsById.get(id)).filter((m): m is OpenRouterModel => Boolean(m));

  if (models.length === 0) {
    await completeBenchmarkRun(runId, "failed");
    return;
  }

  const judgeModelIds = selectJudges(catalog, modelIds, 1);

  try {
    await Promise.all(
      questions.map(async (question) => {
        const results = await Promise.all(models.map((m) => runOneModel(apiKey, m, question.prompt)));

        let evaluations: Awaited<ReturnType<typeof evaluateResponses>>["evaluations"] = [];
        if (judgeModelIds.length > 0) {
          try {
            const outcome = await evaluateResponses(apiKey, question.prompt, results, judgeModelIds, catalog);
            evaluations = outcome.evaluations;
          } catch {
            // Judge failure shouldn't block persisting the raw model answers.
          }
        }
        const evalByModel = new Map(evaluations.map((e) => [e.modelId, e]));

        await Promise.all(
          results.map((r) => {
            const evaluation = evalByModel.get(r.modelId);
            const payload: BenchmarkModelResult = {
              modelId: r.modelId,
              provider: r.provider,
              status: r.status,
              content: r.content,
              error: r.error,
              promptTokens: r.promptTokens ?? 0,
              completionTokens: r.completionTokens ?? 0,
              cost: r.cost ?? 0,
              latencyMs: r.latencyMs ?? 0,
              scores: evaluation?.scores,
              total: evaluation?.total,
            };
            return saveBenchmarkResult(runId, question.id, payload);
          })
        );
      })
    );
    await completeBenchmarkRun(runId, "complete");
  } catch {
    await completeBenchmarkRun(runId, "failed");
  }
}
