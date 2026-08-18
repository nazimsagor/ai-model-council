import { estimateCost, streamChatCompletion } from "../openrouter";
import { completeRun, failRun, saveEvaluation, saveModelResponse } from "../repository";
import type { ChatMessage } from "../openrouter";
import type { ModelRunResult, OpenRouterModel, SSEEvent } from "../types";
import { evaluateResponses } from "./evaluation";
import { buildSummary, synthesizeAnswer } from "./synthesize";

export interface RunCouncilConfig {
  runId: string;
  apiKey: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  selectedModelIds: string[];
  judgeModelIds: string[];
  evaluate: boolean;
  webSearch?: boolean;
  modelTimeoutMs?: number;
}

const DEFAULT_MODEL_TIMEOUT_MS = 45_000;

async function runOneModel(
  apiKey: string,
  modelId: string,
  catalog: Map<string, OpenRouterModel>,
  messages: ChatMessage[],
  opts: { temperature: number; maxTokens: number; timeoutMs: number; webSearch?: boolean },
  emit: (e: SSEEvent) => void
): Promise<ModelRunResult> {
  const model = catalog.get(modelId);
  const provider = model?.provider ?? modelId.split("/")[0];
  const startedAt = Date.now();
  emit({ type: "status", modelId, status: "streaming" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const { content, promptTokens, completionTokens } = await streamChatCompletion(apiKey, modelId, messages, {
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      signal: controller.signal,
      webSearch: opts.webSearch,
      onDelta: (text) => emit({ type: "delta", modelId, text }),
    });
    clearTimeout(timer);

    const cost = model ? estimateCost(model, promptTokens, completionTokens) : 0;
    const result: ModelRunResult = {
      modelId,
      provider,
      status: "complete",
      content,
      promptTokens,
      completionTokens,
      cost,
      latencyMs: Date.now() - startedAt,
    };
    emit({ type: "status", modelId, status: "complete" });
    emit({ type: "model_complete", result });
    return result;
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = controller.signal.aborted;
    const result: ModelRunResult = {
      modelId,
      provider,
      status: isTimeout ? "timeout" : "failed",
      content: "",
      error: isTimeout
        ? `Request timeout after ${Math.round(opts.timeoutMs / 1000)}s`
        : err instanceof Error
          ? err.message
          : String(err),
      latencyMs: Date.now() - startedAt,
    };
    emit({ type: "status", modelId, status: result.status });
    emit({ type: "model_complete", result });
    return result;
  }
}

export async function runCouncil(
  config: RunCouncilConfig,
  catalog: OpenRouterModel[],
  emit: (e: SSEEvent) => void
) {
  const startedAt = Date.now();
  const catalogMap = new Map(catalog.map((m) => [m.id, m]));
  const messages: ChatMessage[] = [];
  if (config.systemPrompt) messages.push({ role: "system", content: config.systemPrompt });
  messages.push({ role: "user", content: config.prompt });

  try {
    const results = await Promise.all(
      config.selectedModelIds.map((modelId) =>
        runOneModel(
          config.apiKey,
          modelId,
          catalogMap,
          messages,
          {
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            timeoutMs: config.modelTimeoutMs ?? DEFAULT_MODEL_TIMEOUT_MS,
            webSearch: config.webSearch,
          },
          emit
        )
      )
    );

    await Promise.all(results.map((r) => saveModelResponse(config.runId, r)));

    const successful = results.filter((r) => r.status === "complete" && r.content.trim());
    const modelCost = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);

    if (successful.length === 0) {
      emit({ type: "error", message: "Every model in the council failed to respond. Nothing to compare." });
      await failRun(config.runId);
      return;
    }

    if (!config.evaluate) {
      const totalTimeMs = Date.now() - startedAt;
      await completeRun(config.runId, { totalCost: modelCost, totalTimeMs });
      emit({ type: "done", runId: config.runId, totalCost: modelCost, totalTimeMs });
      return;
    }

    emit({ type: "evaluating" });

    let evaluationCost = 0;
    const { evaluations, judgesFailed } = await evaluateResponses(
      config.apiKey,
      config.prompt,
      successful,
      config.judgeModelIds
    );
    if (judgesFailed.length > 0) {
      emit({
        type: "error",
        message: `${judgesFailed.length} judge(s) failed and were excluded from scoring: ${judgesFailed
          .map((j) => j.judgeModelId)
          .join(", ")}`,
      });
    }
    await Promise.all(evaluations.map((ev) => saveEvaluation(config.runId, ev)));
    emit({ type: "evaluation_complete", evaluations });

    emit({ type: "synthesizing" });
    const synthesizerModelId = config.judgeModelIds[0] ?? successful[0].modelId;
    const synthesis = await synthesizeAnswer(config.apiKey, synthesizerModelId, config.prompt, successful, evaluations);
    const synthModel = catalogMap.get(synthesizerModelId);
    if (synthModel) {
      // Rough cost estimate for the synthesis call using average token counts.
      evaluationCost += estimateCost(synthModel, 1500, 800);
    }

    const summary = buildSummary(synthesis, evaluations);
    const totalCost = modelCost + evaluationCost;
    const totalTimeMs = Date.now() - startedAt;

    await completeRun(config.runId, { totalCost, totalTimeMs, summary });
    emit({ type: "done", runId: config.runId, summary, totalCost, totalTimeMs });
  } catch (err) {
    await failRun(config.runId).catch(() => {});
    emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}
