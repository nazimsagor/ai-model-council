import type { OpenRouterModel } from "../types";

export interface ComboDef {
  id: string;
  label: string;
  description: string;
}

export const COMBOS: ComboDef[] = [
  { id: "quality-leaders", label: "Quality leaders", description: "Best model from each major lab" },
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

/** Resolves a named combo to concrete model ids from the live catalog —
 *  ranking always comes from real capability/price/context signals, never a
 *  hardcoded model name, so a combo's picks automatically follow whatever
 *  each lab currently ships. Falls back to "quality-leaders" ranking for an
 *  unrecognized id. */
export function resolveCombo(comboId: string, catalog: OpenRouterModel[], count: number): string[] {
  const usable = catalog.filter((m) => !m.id.includes(":batch"));

  switch (comboId) {
    case "budget-smart": {
      const sorted = [...usable]
        .filter((m) => m.pricing.completion > 0)
        .sort((a, b) => a.pricing.completion - b.pricing.completion || capabilityScore(b) - capabilityScore(a));
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
      const sorted = [...usable].sort((a, b) => capabilityScore(b) - capabilityScore(a));
      return onePerProvider(sorted, count);
    }
  }
}
