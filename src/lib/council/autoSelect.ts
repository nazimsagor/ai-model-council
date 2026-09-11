import type { OpenRouterModel } from "../types";
import {
  budgetCandidatePool,
  costAwareModelScore,
  isAutoPickCandidate,
  modelCostPerMillion,
  sortByCostAwareScore,
} from "./modelSelection";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  coding: [
    "code", "function", "bug", "api", "database", "architecture", "programming",
    "algorithm", "sql", "javascript", "typescript", "python", "react", "backend",
    "frontend", "debug", "refactor", "compile", "repository", "deploy",
  ],
  math: [
    "equation", "calculate", "math", "proof", "integral", "derivative",
    "probability", "statistics", "theorem", "geometry", "algebra",
  ],
  research: [
    "research", "explain", "compare", "analysis", "history", "why does",
    "how does", "summarize", "literature", "evidence", "study",
  ],
  creative: [
    "story", "poem", "creative", "write a", "novel", "fiction", "brainstorm",
    "slogan", "marketing copy", "script", "lyrics",
  ],
  vision: ["image", "photo", "picture", "diagram", "screenshot", "chart", "visual"],
  business: [
    "business", "strategy", "pricing", "startup", "revenue", "market",
    "growth", "customer", "sales",
  ],
  decision: [
    "should i", "which is better", "pros and cons", "recommend", "decide",
    "vs", "versus", "or should",
  ],
};

// Preference weights for ranking, not an exhaustive or exclusive list — the
// catalog itself is always fetched dynamically from OpenRouter. These are
// tie-break signals only, e.g. "this id looks like a coding-tuned model".
const CATEGORY_HINTS: Record<string, string[]> = {
  coding: ["coder", "code", "deepseek-r1", "o1", "o3", "o4", "qwen2.5-coder", "sonnet", "gpt-4.1", "gpt-4o", "codestral"],
  math: ["r1", "o1", "o3", "o4", "qwq", "math", "reasoning"],
  research: ["sonnet", "opus", "gpt-4o", "gpt-4.1", "gemini", "perplexity", "r1"],
  creative: ["claude", "gpt-4o", "gemini", "opus"],
  business: ["sonnet", "opus", "gpt-4o", "gpt-4.1", "gemini"],
  decision: ["sonnet", "opus", "gpt-4o", "gemini", "r1"],
};

const FLAGSHIP_HINTS = [
  "gpt-4o", "gpt-4.1", "gpt-5", "o1", "o3", "o4",
  "claude-3.7-sonnet", "claude-sonnet-4", "claude-opus-4", "claude-3.5-sonnet",
  "gemini-2.0", "gemini-2.5", "gemini-1.5-pro",
  "deepseek-r1", "deepseek-v3", "llama-3.3", "llama-4",
  "qwen2.5", "qwen3", "grok-2", "grok-3", "grok-4",
  "mistral-large", "command-r-plus",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word/phrase match so short keywords (e.g. "photo", "vs") don't false-positive
 *  on substrings inside unrelated words (e.g. "photosynthesis", "obvious"). */
function containsWord(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
}

export function classifyPrompt(prompt: string): { category: string; matched: string[] } {
  let best = "general";
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.filter((kw) => containsWord(prompt, kw));
    if (matched.length > bestScore) {
      best = category;
      bestScore = matched.length;
      bestMatched = matched;
    }
  }

  return { category: bestScore > 0 ? best : "general", matched: bestMatched };
}

export interface AutoSelectResult {
  category: string;
  reason: string;
  modelIds: string[];
}

export function autoSelectModels(
  prompt: string,
  catalog: OpenRouterModel[],
  count: number
): AutoSelectResult {
  const { category, matched } = classifyPrompt(prompt);
  const requiresVision = category === "vision";
  const hints = CATEGORY_HINTS[category] ?? [];

  const pool = requiresVision ? catalog.filter((m) => m.capabilities.vision) : catalog;
  const candidates = budgetCandidatePool(pool, Math.min(count, Math.max(pool.length, 1)));
  const sourcePool = candidates.length > 0 ? candidates : pool.filter(isAutoPickCandidate);

  const scored = (sourcePool.length > 0 ? sourcePool : pool).map((model) => {
    const idLower = model.id.toLowerCase();
    let score = costAwareModelScore(model);
    for (const hint of hints) if (idLower.includes(hint)) score += 3;
    for (const hint of FLAGSHIP_HINTS) if (idLower.includes(hint)) score += 1;
    if (model.capabilities.reasoning && (category === "math" || category === "research")) score += 2;
    if (model.capabilities.tools && category === "coding") score += 1;
    score += Math.min(model.contextLength / 200_000, 1);
    return { model, score };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      modelCostPerMillion(a.model) - modelCostPerMillion(b.model) ||
      b.model.contextLength - a.model.contextLength
  );

  const selected: string[] = [];
  const perProvider = new Map<string, number>();
  const maxPerProvider = Math.max(2, Math.ceil(count / 4));

  for (const { model } of scored) {
    if (selected.length >= count) break;
    const used = perProvider.get(model.provider) ?? 0;
    if (used >= maxPerProvider) continue;
    selected.push(model.id);
    perProvider.set(model.provider, used + 1);
  }

  // Backfill if provider diversity cap left us short.
  if (selected.length < count) {
    for (const { model } of scored) {
      if (selected.length >= count) break;
      if (!selected.includes(model.id)) selected.push(model.id);
    }
  }

  const reason =
    category === "general"
      ? "No strong topic signal detected — selected a diverse, lower-cost set of reliable models."
      : `Your prompt appears to be ${category.toUpperCase()}${matched.length ? ` (matched: ${matched.slice(0, 3).join(", ")})` : ""}. Prioritized lower-cost models suited to this kind of task.`;

  return { category, reason, modelIds: selected };
}

export interface CouncilRecommendation {
  modelIds: string[];
  judgeModelId: string | null;
  source: "trending" | "heuristic";
}

const JUDGE_PROVIDER = "anthropic";
const COST_CONSCIOUS_PROVIDER_ORDER = [
  "openai",
  "google",
  "deepseek",
  "qwen",
  "meta-llama",
  "mistralai",
  "anthropic",
  "x-ai",
];

/** The best current lower-cost interactive model for one provider, from real
 *  catalog signals only. Manual picking still exposes the full catalog; this
 *  is only for defaults and automatic selection. */
function bestBudgetModelForProvider(provider: string, catalog: OpenRouterModel[]): string | null {
  const providerModels = catalog.filter((m) => m.provider === provider);
  const budgetPool = budgetCandidatePool(providerModels, 1);
  const candidates = budgetPool.length > 0 ? budgetPool : providerModels.filter(isAutoPickCandidate);
  if (candidates.length === 0) return null;
  return sortByCostAwareScore(candidates)[0].id;
}

/** Picks up to `n` models from `orderedIds`, at most one per provider, so a
 *  council of "trending" or "best" models isn't secretly 3 variants of the
 *  same lab's model. */
function pickOnePerProvider(
  orderedIds: string[],
  catalogMap: Map<string, OpenRouterModel>,
  n: number,
  exclude: Set<string>
): string[] {
  const picked: string[] = [];
  const usedProviders = new Set<string>();
  for (const id of orderedIds) {
    if (picked.length >= n) break;
    if (exclude.has(id) || picked.includes(id)) continue;
    const model = catalogMap.get(id);
    if (!model) continue;
    if (usedProviders.has(model.provider)) continue;
    picked.push(id);
    usedProviders.add(model.provider);
  }
  return picked;
}

/** Picks a judge from `orderedIds`, preferring one whose provider isn't
 *  already represented among the debaters (so the judge is a genuinely
 *  independent perspective, not just a different model from a lab that's
 *  already debating) — falling back to any remaining model if the catalog
 *  is too small for that. */
function pickJudge(
  orderedIds: string[],
  catalogMap: Map<string, OpenRouterModel>,
  debaterIds: string[]
): string | null {
  const debaterProviders = new Set(debaterIds.map((id) => catalogMap.get(id)?.provider).filter(Boolean));
  const outsideDebaterProviders = orderedIds.find((id) => {
    if (debaterIds.includes(id)) return false;
    const model = catalogMap.get(id);
    return model && !debaterProviders.has(model.provider);
  });
  if (outsideDebaterProviders) return outsideDebaterProviders;
  return orderedIds.find((id) => !debaterIds.includes(id) && catalogMap.has(id)) ?? null;
}

/** Recommends a default Council lineup: `count` debaters plus one separate
 *  judge. The default is now cost-conscious: it prefers lower-cost reliable
 *  provider picks from the live catalog, keeps provider diversity, and only
 *  falls back to broader catalog/trending candidates if cheap coverage is too
 *  small. */
export function buildCouncilRecommendation(
  catalog: OpenRouterModel[],
  trendingIds: string[],
  count: number
): CouncilRecommendation {
  const catalogMap = new Map(catalog.map((m) => [m.id, m]));
  const preferredJudge = bestBudgetModelForProvider(JUDGE_PROVIDER, catalog);
  const debaterProviderPicks = COST_CONSCIOUS_PROVIDER_ORDER.filter((p) => p !== JUDGE_PROVIDER).map((p) =>
    bestBudgetModelForProvider(p, catalog)
  ).filter(
    (id): id is string => id !== null
  );

  if (debaterProviderPicks.length >= count) {
    const debaters = debaterProviderPicks.slice(0, count);
    const judgeModelId =
      (preferredJudge && !debaters.includes(preferredJudge) ? preferredJudge : undefined) ??
      debaterProviderPicks.slice(count).find((id) => !debaters.includes(id)) ??
      pickJudge(sortByCostAwareScore(budgetCandidatePool(catalog, 1)).map((m) => m.id), catalogMap, debaters);
    return { modelIds: debaters, judgeModelId, source: "heuristic" };
  }

  const budgetOrderedIds = sortByCostAwareScore(budgetCandidatePool(catalog, count)).map((m) => m.id);
  const budgetIdSet = new Set(budgetOrderedIds);
  const budgetTrendingIds = trendingIds.filter((id) => budgetIdSet.has(id));
  const debaters = pickOnePerProvider(
    [...debaterProviderPicks, ...budgetOrderedIds, ...budgetTrendingIds],
    catalogMap,
    count,
    new Set()
  );
  if (debaters.length === count) {
    const judgeModelId =
      (preferredJudge && !debaters.includes(preferredJudge) ? preferredJudge : undefined) ??
      pickJudge([...budgetOrderedIds, ...budgetTrendingIds], catalogMap, debaters);
    return { modelIds: debaters, judgeModelId, source: "heuristic" };
  }

  const scored = sortByCostAwareScore(catalog.filter(isAutoPickCandidate)).map((model) => model.id);
  const fallbackDebaters = pickOnePerProvider(scored, catalogMap, count, new Set());
  const judgeModelId =
    (preferredJudge && !fallbackDebaters.includes(preferredJudge) ? preferredJudge : undefined) ??
    pickJudge(scored, catalogMap, fallbackDebaters);
  return { modelIds: fallbackDebaters, judgeModelId, source: "heuristic" };
}

export const COUNCIL_MODE_COUNTS: Record<string, number> = {
  four: 4,
  six: 6,
  eight: 8,
};
