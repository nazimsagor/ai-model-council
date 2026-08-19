import type { OpenRouterModel } from "../types";

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

  const scored = pool.map((model) => {
    const idLower = model.id.toLowerCase();
    let score = 0;
    for (const hint of hints) if (idLower.includes(hint)) score += 3;
    for (const hint of FLAGSHIP_HINTS) if (idLower.includes(hint)) score += 2;
    if (model.capabilities.reasoning && (category === "math" || category === "research")) score += 2;
    if (model.capabilities.tools && category === "coding") score += 1;
    score += Math.min(model.contextLength / 200_000, 1); // mild bonus for long context
    return { model, score };
  });

  scored.sort((a, b) => b.score - a.score);

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
      ? "No strong topic signal detected — selected a diverse, well-rounded set of flagship models."
      : `Your prompt appears to be ${category.toUpperCase()}${matched.length ? ` (matched: ${matched.slice(0, 3).join(", ")})` : ""}. Prioritized models suited to this kind of task.`;

  return { category, reason, modelIds: selected };
}

export interface CouncilRecommendation {
  modelIds: string[];
  judgeModelId: string | null;
  source: "trending" | "heuristic";
}

// Stable list of major-lab *providers* (not model names — provider slugs
// rarely change even as individual models ship/retire) so the default
// Council panel is built from recognizable labs rather than whichever
// small/regional provider happens to be topping this week's raw token
// volume. Each provider's actual model is still picked dynamically from
// the live catalog below, so this never goes stale.
//
// Anthropic is deliberately excluded from this list and used as the
// preferred judge instead — matching the reference panel layout where the
// Claude card carries the judge crown rather than debating. (Claude Opus 5
// still debates separately — see findClaudeOpus5 below — so Anthropic
// intentionally appears twice: once judging, once debating.)
const JUDGE_PROVIDER = "anthropic";
const MAJOR_LAB_PROVIDERS = ["openai", "google", "x-ai", "meta-llama", "mistralai", "deepseek", "qwen"];

/** Pinned per explicit request: Claude Opus 5 debates alongside the other
 *  major labs specifically — not "Anthropic's algorithmic best" (which
 *  resolves to a pricier Fable/Fast variant instead, since capabilityScore's
 *  price tie-break caps out below Opus 5's own price). Matched by id
 *  substring since a specific named generation, not "current best", is what
 *  was asked for. */
function findClaudeOpus5(catalog: OpenRouterModel[]): string | null {
  const candidates = catalog.filter(
    (m) => m.provider === "anthropic" && /opus-5/i.test(m.id) && !m.id.includes(":batch")
  );
  if (candidates.length === 0) return null;
  const plain = candidates.find((m) => !/-fast$/i.test(m.id));
  return (plain ?? candidates[0]).id;
}

function capabilityScore(model: OpenRouterModel): number {
  return (
    (model.capabilities.reasoning ? 3 : 0) +
    (model.capabilities.tools ? 1 : 0) +
    Math.min(model.contextLength / 500_000, 2) +
    // Gentle tie-break, not a primary signal: within one lab, the pricier
    // tier is consistently the more capable one (Opus > Sonnet > Haiku,
    // Pro > Flash), so this nudges ties toward the premium variant.
    Math.min((model.pricing.completion * 1_000_000) / 50, 1)
  );
}

// Excluded from auto-pick despite scoring well on paper: openai/gpt-5.4-pro
// was observed via production logs to consistently time out (zero streamed
// output for 40s+, across three separate timeout configurations tried this
// session) — a real reliability issue on OpenRouter right now, not a bug in
// our request handling. gpt-5.5-pro ties it exactly on capabilityScore (same
// $180/M "Pro" tier), so excluding only gpt-5.4-pro would just swap in its
// untested twin in the same risk category — both are excluded together so
// the pick actually lands on a different, non-"Pro" tier. Revisit if the
// underlying reliability issue changes.
const UNRELIABLE_MODEL_IDS = new Set(["openai/gpt-5.4-pro", "openai/gpt-5.5-pro"]);

/** The best current interactive model for one provider, by real capability
 *  signals (reasoning/tools/context) — never a hardcoded model id, so a
 *  provider's pick automatically follows whatever they currently ship
 *  (aside from UNRELIABLE_MODEL_IDS, an explicit reliability override). */
function bestModelForProvider(provider: string, catalog: OpenRouterModel[]): string | null {
  const candidates = catalog.filter(
    (m) => m.provider === provider && !m.id.includes(":batch") && !UNRELIABLE_MODEL_IDS.has(m.id)
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => capabilityScore(b) - capabilityScore(a))[0].id;
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
 *  judge. Prefers a stable panel of major-lab providers (OpenAI, Google,
 *  xAI, Meta, Mistral, DeepSeek, Qwen) plus Claude Opus 5 as debaters, with
 *  a different Anthropic model (its current algorithmic best) as the judge
 *  — each lab's *current* best model, picked dynamically, not a hardcoded
 *  name (Opus 5 excepted, per explicit request), since a recognizable
 *  default panel reads better than whichever provider happens to top this
 *  week's raw token volume. Falls back to live OpenRouter trending data if
 *  the catalog doesn't have enough major-lab coverage (e.g. free-only mode
 *  excludes one of them), then to a capability-only heuristic (reasoning +
 *  tools + context length — still no hardcoded model names) as a last
 *  resort. */
export function buildCouncilRecommendation(
  catalog: OpenRouterModel[],
  trendingIds: string[],
  count: number
): CouncilRecommendation {
  const catalogMap = new Map(catalog.map((m) => [m.id, m]));
  const preferredJudge = bestModelForProvider(JUDGE_PROVIDER, catalog);

  const majorLabPicks = MAJOR_LAB_PROVIDERS.map((p) => bestModelForProvider(p, catalog)).filter(
    (id): id is string => id !== null
  );
  const opus5 = findClaudeOpus5(catalog);
  // Opus 5 goes first (not appended) so it survives truncation for smaller
  // council sizes (5/7-member) instead of only ever showing up at 8+.
  const pinnedPicks = opus5 && !majorLabPicks.includes(opus5) ? [opus5, ...majorLabPicks] : majorLabPicks;

  if (pinnedPicks.length >= count) {
    const debaters = pinnedPicks.slice(0, count);
    const judgeModelId =
      (preferredJudge && !debaters.includes(preferredJudge) ? preferredJudge : undefined) ??
      pinnedPicks.slice(count).find((id) => !debaters.includes(id)) ??
      pickJudge(trendingIds.length > 0 ? trendingIds : pinnedPicks, catalogMap, debaters);
    return { modelIds: debaters, judgeModelId, source: "trending" };
  }

  if (trendingIds.length > 0) {
    // Backfill any remaining slots (beyond what major-lab coverage gave us)
    // with real trending picks from other providers.
    const debaters = pickOnePerProvider(
      [...pinnedPicks, ...trendingIds],
      catalogMap,
      count,
      new Set()
    );
    if (debaters.length === count) {
      const judgeModelId =
        (preferredJudge && !debaters.includes(preferredJudge) ? preferredJudge : undefined) ??
        pickJudge(trendingIds, catalogMap, debaters);
      return { modelIds: debaters, judgeModelId, source: "trending" };
    }
  }

  // Fallback: no hardcoded model names, just real capability signals from
  // the live catalog — reasoning + tool support + longer context, so this
  // never goes stale the way a hardcoded name list does.
  const scored = catalog
    .map((model) => ({
      model,
      score:
        (model.capabilities.reasoning ? 3 : 0) +
        (model.capabilities.tools ? 1 : 0) +
        Math.min(model.contextLength / 500_000, 2),
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.model.id);

  const debaters = pickOnePerProvider(scored, catalogMap, count, new Set());
  const judgeModelId =
    (preferredJudge && !debaters.includes(preferredJudge) ? preferredJudge : undefined) ??
    pickJudge(scored, catalogMap, debaters);
  return { modelIds: debaters, judgeModelId, source: "heuristic" };
}

export const COUNCIL_MODE_COUNTS: Record<string, number> = {
  five: 5,
  seven: 7,
  nine: 9,
};
