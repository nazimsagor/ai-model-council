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

// Absolute ceiling per debater — a hard cap regardless of activity, so a
// pathologically slow model can't eat the whole function budget alone.
const DEFAULT_MODEL_TIMEOUT_MS = 130_000;
// Some providers (esp. "pro"/reasoning-heavy tiers under load) are just slow
// to generate — they're still actively streaming tokens, just not quickly.
// Killing them on a fixed wall-clock timer treats "slow but working" the
// same as "actually hung". Instead, only abort for real silence: reset this
// timer on every delta received, so a model only times out if it goes quiet
// for this long, not just because the whole response took a while.
const IDLE_TIMEOUT_MS = 40_000;
// Judge/synthesis run sequentially AFTER the (parallel) debater phase, so
// their budgets have to fit inside what's left of the route's maxDuration
// (300s) — generous enough for a slow judge model, but capped so the whole
// pipeline can't blow past the function timeout.
const JUDGE_TIMEOUT_MS = 75_000;
const SYNTHESIS_TIMEOUT_MS = 75_000;
// Reasoning-capable models can spend their entire token budget on internal
// "thinking" and never emit visible content if maxTokens is small — they
// still get billed for those tokens, so the user pays for nothing. Give
// them enough headroom to actually finish reasoning and still answer.
const MIN_MAX_TOKENS_FOR_REASONING_MODELS = 3000;

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
  const absoluteTimer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let idleTimer: ReturnType<typeof setTimeout>;
  let wentIdle = false;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      wentIdle = true;
      controller.abort();
    }, IDLE_TIMEOUT_MS);
  };
  resetIdleTimer();
  const clearTimers = () => {
    clearTimeout(absoluteTimer);
    clearTimeout(idleTimer);
  };

  const effectiveMaxTokens = model?.capabilities.reasoning
    ? Math.max(opts.maxTokens, MIN_MAX_TOKENS_FOR_REASONING_MODELS)
    : opts.maxTokens;

  try {
    const { content, promptTokens, completionTokens } = await streamChatCompletion(apiKey, modelId, messages, {
      temperature: opts.temperature,
      maxTokens: effectiveMaxTokens,
      signal: controller.signal,
      webSearch: opts.webSearch,
      onDelta: (text) => {
        resetIdleTimer();
        emit({ type: "delta", modelId, text });
      },
    });
    clearTimers();

    const cost = model ? estimateCost(model, promptTokens, completionTokens) : 0;
    const result: ModelRunResult = {
      modelId,
      provider,
      status: content.trim() ? "complete" : "failed",
      content,
      error: content.trim() ? undefined : "The model used its entire token budget on internal reasoning and never produced a visible answer.",
      promptTokens,
      completionTokens,
      cost,
      latencyMs: Date.now() - startedAt,
    };
    emit({ type: "status", modelId, status: result.status });
    emit({ type: "model_complete", result });
    return result;
  } catch (err) {
    clearTimers();
    const isTimeout = controller.signal.aborted;
    const result: ModelRunResult = {
      modelId,
      provider,
      status: isTimeout ? "timeout" : "failed",
      content: "",
      error: isTimeout
        ? wentIdle
          ? `The model stopped responding — no output for ${Math.round(IDLE_TIMEOUT_MS / 1000)}s.`
          : `Request timeout after ${Math.round(opts.timeoutMs / 1000)}s.`
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
      config.judgeModelIds,
      JUDGE_TIMEOUT_MS
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
    // The synthesis call can fail (timeout, rate limit, bad JSON) just like any
    // other model call — with a single judge there's no other model to fall
    // back on, so a failure here must NOT take down the whole run. Fall back
    // to the top-scoring individual response rather than losing the verdict.
    let synthesis;
    try {
      synthesis = await synthesizeAnswer(
        config.apiKey,
        synthesizerModelId,
        config.prompt,
        successful,
        evaluations,
        SYNTHESIS_TIMEOUT_MS
      );
      const synthModel = catalogMap.get(synthesizerModelId);
      if (synthModel) {
        // Rough cost estimate for the synthesis call using average token counts.
        evaluationCost += estimateCost(synthModel, 1500, 800);
      }
    } catch (err) {
      emit({
        type: "error",
        message: `Synthesis by ${synthesizerModelId} failed (${err instanceof Error ? err.message : String(err)}); showing the top-scoring individual response instead.`,
      });
      const fallbackTop = [...evaluations].sort((a, b) => b.total - a.total)[0];
      const fallbackResult = fallbackTop
        ? successful.find((r) => r.modelId === fallbackTop.modelId)
        : successful[0];
      synthesis = {
        finalAnswer: fallbackResult?.content ?? "The council could not produce a synthesized answer.",
        whyChosen: fallbackResult
          ? [`The synthesizer model failed, so this is ${fallbackResult.modelId}'s top-scoring individual response, shown as-is.`]
          : [],
        disagreements: [],
      };
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
