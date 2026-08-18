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

export const COUNCIL_MODE_COUNTS: Record<string, number> = {
  fast: 4,
  balanced: 8,
  deep: 15,
  maximum: 25,
};
