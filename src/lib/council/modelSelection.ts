import type { OpenRouterModel } from "../types";

export const UNRELIABLE_MODEL_IDS = new Set(["openai/gpt-5.4-pro", "openai/gpt-5.5-pro"]);

const PREFERRED_TOTAL_COST_PER_MILLION = 2;
const FALLBACK_TOTAL_COST_PER_MILLION = 6;
const MIN_INTERACTIVE_CONTEXT = 8_000;

const MAJOR_PROVIDER_BONUS = new Set([
  "openai",
  "anthropic",
  "google",
  "x-ai",
  "meta-llama",
  "mistralai",
  "deepseek",
  "qwen",
  "amazon",
  "cohere",
  "microsoft",
]);

const COST_EFFICIENT_HINTS = [
  "flash",
  "lite",
  "mini",
  "nano",
  "small",
  "haiku",
  "oss",
  "gemma",
  "nemo",
];

const AUTO_PICK_EXCLUDED_PATTERNS = [
  /(?:^|[-_/])(guard|safeguard|moderation|moderator|safety)(?:$|[-_/])/i,
  /(?:^|[-_/])(embed|embedding|rerank|reranker)(?:$|[-_/])/i,
  /(?:^|[-_/])(tts|stt|whisper|transcribe|audio|voice|music)(?:$|[-_/])/i,
];

export function isFreeModel(model: OpenRouterModel): boolean {
  return model.pricing.prompt === 0 && model.pricing.completion === 0;
}

export function modelCostPerMillion(model: OpenRouterModel): number {
  return (model.pricing.prompt + model.pricing.completion) * 1_000_000;
}

export function isAutoPickCandidate(model: OpenRouterModel): boolean {
  if (model.id.includes(":batch")) return false;
  if (UNRELIABLE_MODEL_IDS.has(model.id)) return false;
  if (model.contextLength > 0 && model.contextLength < MIN_INTERACTIVE_CONTEXT) return false;
  return !AUTO_PICK_EXCLUDED_PATTERNS.some((pattern) => pattern.test(model.id));
}

export function budgetCandidatePool(catalog: OpenRouterModel[], minCount: number): OpenRouterModel[] {
  const usable = catalog.filter(isAutoPickCandidate);
  const paid = usable.filter((model) => !isFreeModel(model));
  const preferred = paid.filter((model) => modelCostPerMillion(model) <= PREFERRED_TOTAL_COST_PER_MILLION);
  if (preferred.length >= minCount) return preferred;

  const fallback = paid.filter((model) => modelCostPerMillion(model) <= FALLBACK_TOTAL_COST_PER_MILLION);
  if (fallback.length >= minCount) return fallback;

  if (paid.length >= minCount) return paid;
  return usable;
}

export function costAwareModelScore(model: OpenRouterModel): number {
  const idLower = model.id.toLowerCase();
  const cost = Math.max(modelCostPerMillion(model), 0.05);
  let score = 0;

  score += MAJOR_PROVIDER_BONUS.has(model.provider) ? 1.5 : 0;
  score += model.capabilities.reasoning ? 2.5 : 0;
  score += model.capabilities.tools ? 1 : 0;
  score += Math.min(model.contextLength / 500_000, 2);
  score += COST_EFFICIENT_HINTS.some((hint) => idLower.includes(hint)) ? 0.7 : 0;

  // Lower price matters, but do not let absolute cheapest tiny/utility models
  // outrank capable low-cost models from the live catalog.
  score -= Math.log10(cost) * 1.2;

  return score;
}

export function sortByCostAwareScore(models: OpenRouterModel[]): OpenRouterModel[] {
  return [...models].sort(
    (a, b) =>
      costAwareModelScore(b) - costAwareModelScore(a) ||
      modelCostPerMillion(a) - modelCostPerMillion(b) ||
      b.contextLength - a.contextLength ||
      a.id.localeCompare(b.id)
  );
}
