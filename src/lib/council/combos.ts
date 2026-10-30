import type { OpenRouterModel } from "../types";
import {
  budgetCandidatePool,
  costAwareModelScore,
  isAutoPickCandidate,
  modelCostPerMillion,
} from "./modelSelection";

export interface ComboDef {
  id: string;
  label: string;
  description: string;
}

export const COMBOS: ComboDef[] = [
  { id: "quality-leaders", label: "Quality leaders", description: "Premium flagships people use most this week" },
  { id: "budget-smart", label: "Budget smart", description: "Strong answers at the lowest realistic cost" },
  { id: "fast-lane", label: "Fast lane", description: "Lighter, non-reasoning models that respond quickly" },
  { id: "coding-squad", label: "Coding squad", description: "Models with strong tool-use / coding support" },
  { id: "long-context", label: "Long context", description: "The largest context windows, for big documents" },
  { id: "open-source-power", label: "Open-source power", description: "Leading open-weight models" },
  { id: "best-free", label: "Best free", description: "The strongest models that cost $0" },
  { id: "chinese-only", label: "Chinese only", description: "Models from Chinese labs" },
];

// Provider-level curation — provider slugs rarely change even as individual
// models ship/retire, unlike model names, so this is far less likely to go
// stale than a hardcoded model list (same reasoning as PROVIDER_DOMAINS in
// providerColors.ts).
const CHINESE_PROVIDERS = new Set([
  "deepseek", "qwen", "z-ai", "moonshotai", "baidu", "bytedance", "bytedance-seed",
  "tencent", "xiaomi", "minimax", "stepfun", "meituan", "kwaipilot", "inclusionai", "dots-studio",
]);

const OPEN_SOURCE_PROVIDERS = new Set([
  "meta-llama", "mistralai", "qwen", "deepseek", "nousresearch", "allenai", "ibm-granite",
  "liquid", "arcee-ai", "cognitivecomputations", "thedrummer", "undi95", "gryphe", "sao10k",
  "moonshotai", "z-ai", "microsoft", "nvidia", "stepfun", "thinkingmachines", "deepcogito",
]);

function capabilityScore(m: OpenRouterModel): number {
  return (
    (m.capabilities.reasoning ? 3 : 0) +
    (m.capabilities.tools ? 1 : 0) +
    Math.min(m.contextLength / 500_000, 2) +
    Math.min((m.pricing.completion * 1_000_000) / 50, 1)
  );
}

function costAwareSort(models: OpenRouterModel[]): OpenRouterModel[] {
  return [...models].sort(
    (a, b) =>
      costAwareModelScore(b) - costAwareModelScore(a) ||
      modelCostPerMillion(a) - modelCostPerMillion(b) ||
      b.contextLength - a.contextLength
  );
}

/** Picks up to `count` models from an already-sorted list, at most one per
 *  provider, so a combo isn't secretly 3 variants of the same lab's model. */
function onePerProvider(sorted: OpenRouterModel[], count: number): string[] {
  const picked: string[] = [];
  const used = new Set<string>();
  for (const m of sorted) {
    if (picked.length >= count) break;
    if (used.has(m.provider)) continue;
    picked.push(m.id);
    used.add(m.provider);
  }
  return picked;
}

// Labs whose flagship leads a "Quality leaders" lineup, in this order; any
// other lab with a trending paid flagship follows by its weekly usage.
const PREMIUM_LAB_ORDER = ["anthropic", "openai", "google", "x-ai"];
const PREMIUM_TRENDING_DEPTH = 80;

/** Each lab's flagship — its priciest paid reasoning model among this week's
 *  most-used — with the big premium labs first. Empty without trending data. */
function premiumFlagships(usable: OpenRouterModel[], trendingIds: string[]): string[] {
  const byId = new Map(usable.map((m) => [m.id, m]));
  const flagship = new Map<string, OpenRouterModel>();
  const labUsageRank = new Map<string, number>();
  trendingIds.slice(0, PREMIUM_TRENDING_DEPTH).forEach((id, index) => {
    const m = byId.get(id);
    if (!m || !m.capabilities.reasoning || modelCostPerMillion(m) === 0) return;
    if (!labUsageRank.has(m.provider)) labUsageRank.set(m.provider, index);
    const current = flagship.get(m.provider);
    if (!current || modelCostPerMillion(m) > modelCostPerMillion(current)) flagship.set(m.provider, m);
  });
  const rank = (provider: string) => {
    const preferred = PREMIUM_LAB_ORDER.indexOf(provider);
    return preferred === -1 ? PREMIUM_LAB_ORDER.length + labUsageRank.get(provider)! : preferred;
  };
  return [...flagship.values()].sort((a, b) => rank(a.provider) - rank(b.provider)).map((m) => m.id);
}

/** Resolves a named combo to concrete model ids from the live catalog —
 *  ranking always comes from real capability/price/context/usage signals,
 *  never a hardcoded model name, so a combo's picks automatically follow
 *  whatever each lab currently ships. Falls back to "quality-leaders" ranking
 *  for an unrecognized id. */
export function resolveCombo(
  comboId: string,
  catalog: OpenRouterModel[],
  count: number,
  trendingIds: string[] = []
): string[] {
  const usable = catalog.filter(isAutoPickCandidate);

  switch (comboId) {
    case "budget-smart": {
      const sorted = costAwareSort(budgetCandidatePool(usable, count));
      return onePerProvider(sorted, count);
    }
    case "fast-lane": {
      const sorted = [...usable]
        .filter((m) => !m.capabilities.reasoning)
        .sort((a, b) => a.pricing.completion - b.pricing.completion);
      return onePerProvider(sorted, count);
    }
    case "coding-squad": {
      const sorted = [...usable]
        .filter((m) => m.capabilities.tools)
        .sort((a, b) => capabilityScore(b) - capabilityScore(a));
      return onePerProvider(sorted, count);
    }
    case "long-context": {
      const sorted = [...usable].sort((a, b) => b.contextLength - a.contextLength);
      return onePerProvider(sorted, count);
    }
    case "open-source-power": {
      const sorted = [...usable]
        .filter((m) => OPEN_SOURCE_PROVIDERS.has(m.provider))
        .sort((a, b) => capabilityScore(b) - capabilityScore(a));
      return onePerProvider(sorted, count);
    }
    case "best-free": {
      const sorted = [...usable]
        .filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0)
        .sort((a, b) => capabilityScore(b) - capabilityScore(a));
      return onePerProvider(sorted, count);
    }
    case "chinese-only": {
      const sorted = [...usable]
        .filter((m) => CHINESE_PROVIDERS.has(m.provider))
        .sort((a, b) => capabilityScore(b) - capabilityScore(a));
      return onePerProvider(sorted, count);
    }
    case "quality-leaders":
    default: {
      const premium = premiumFlagships(usable, trendingIds);
      if (premium.length >= count) return premium.slice(0, count);
      const sorted = [...usable].sort((a, b) => capabilityScore(b) - capabilityScore(a));
      return onePerProvider(sorted, count);
    }
  }
}
