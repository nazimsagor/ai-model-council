import type { OpenRouterModel } from "./types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

function headers(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "AI Model Council",
  };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  return h;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("No OpenRouter API key provided. Add your key to run a council.");
    this.name = "MissingApiKeyError";
  }
}

// ---- Model catalog (public endpoint — no key required, cached in-process) ----

let modelCache: { models: OpenRouterModel[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface RawOpenRouterModel {
  id: string;
  canonical_slug?: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
  supported_parameters?: string[];
}

/** This app only does text chat completions — models that generate audio,
 *  image, or video output (e.g. music-generation models) return unusable
 *  garbage from our /chat/completions calls, so they're excluded from the
 *  catalog entirely rather than showing up as a confusing "successful"
 *  response full of timestamps or binary data. */
function isTextOutputModel(raw: RawOpenRouterModel): boolean {
  const outputs = raw.architecture?.output_modalities;
  if (!outputs || outputs.length === 0) return true; // assume text if unreported
  return outputs.every((m) => m === "text");
}

// Maps OpenRouter's dated "canonical_slug" (used by the rankings API) back to
// the plain catalog id used everywhere else in this app. Populated whenever
// listModels() runs.
let canonicalSlugToId = new Map<string, string>();

function deriveProvider(id: string): string {
  const slash = id.indexOf("/");
  return slash === -1 ? "other" : id.slice(0, slash);
}

function parseModel(raw: RawOpenRouterModel): OpenRouterModel {
  const modality = raw.architecture?.modality ?? "";
  const inputModalities = raw.architecture?.input_modalities ?? [];
  const supported = raw.supported_parameters ?? [];
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    description: raw.description ?? "",
    contextLength: raw.context_length ?? 0,
    pricing: {
      prompt: Number(raw.pricing?.prompt ?? 0),
      completion: Number(raw.pricing?.completion ?? 0),
    },
    provider: deriveProvider(raw.id),
    capabilities: {
      vision: modality.includes("image") || inputModalities.includes("image"),
      tools: supported.includes("tools") || supported.includes("tool_choice"),
      reasoning: supported.includes("reasoning") || supported.includes("include_reasoning"),
    },
  };
}

export async function listModels(forceRefresh = false): Promise<OpenRouterModel[]> {
  if (!forceRefresh && modelCache && Date.now() - modelCache.fetchedAt < CACHE_TTL_MS) {
    return modelCache.models;
  }

  // The /models catalog is public on OpenRouter — no API key needed to browse it.
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data: RawOpenRouterModel[] };
  const textModels = json.data.filter(isTextOutputModel);
  const models = textModels.map(parseModel).sort((a, b) => a.id.localeCompare(b.id));
  modelCache = { models, fetchedAt: Date.now() };
  // Several ids can share one canonical_slug (e.g. a model and its ":batch"
  // variant) — prefer the plain interactive id, since ":batch" models don't
  // return synchronous chat completions the way this app calls them.
  const slugMap = new Map<string, string>();
  for (const m of textModels) {
    if (!m.canonical_slug) continue;
    const existing = slugMap.get(m.canonical_slug);
    if (!existing || (existing.includes(":") && !m.id.includes(":"))) {
      slugMap.set(m.canonical_slug, m.id);
    }
  }
  canonicalSlugToId = slugMap;
  return models;
}

// ---- Live trending (real usage on OpenRouter this week) ----
// Uses OpenRouter's public rankings data (the same data openrouter.ai/rankings
// renders) so model recommendations reflect what's actually being used right
// now instead of a hardcoded list of model names that inevitably goes stale
// as new models ship. Falls back to an empty list (callers must handle that)
// if this ever breaks — it's not a documented/stable API.
interface TrendingRow {
  model_permaslug: string;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
}

let trendingCache: { ids: string[]; fetchedAt: number } | null = null;
const TRENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getTrendingModelIds(): Promise<string[]> {
  if (trendingCache && Date.now() - trendingCache.fetchedAt < TRENDING_TTL_MS) {
    return trendingCache.ids;
  }
  try {
    await listModels(); // ensures canonicalSlugToId is populated
    const res = await fetch("https://openrouter.ai/api/frontend/v1/rankings/models?view=week", {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`rankings fetch failed: ${res.status}`);
    const json = (await res.json()) as { data: TrendingRow[] };

    const totals = new Map<string, number>();
    for (const row of json.data) {
      const id = canonicalSlugToId.get(row.model_permaslug);
      if (!id) continue;
      const tokens = (row.total_prompt_tokens ?? 0) + (row.total_completion_tokens ?? 0);
      totals.set(id, (totals.get(id) ?? 0) + tokens);
    }

    const ids = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    trendingCache = { ids, fetchedAt: Date.now() };
    return ids;
  } catch {
    return [];
  }
}

export async function getModelById(id: string): Promise<OpenRouterModel | undefined> {
  const models = await listModels();
  return models.find((m) => m.id === id);
}

// ---- Chat completion (non-streaming) — requires the caller's own API key ----

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export async function chatCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal; webSearch?: boolean } = {}
): Promise<CompletionResult> {
  if (!apiKey) throw new MissingApiKeyError();
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(apiKey),
    signal: opts.signal,
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.webSearch ? { plugins: [{ id: "web" }] } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return {
    content: json.choices?.[0]?.message?.content ?? "",
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
  };
}

// ---- Chat completion (streaming, SSE from OpenRouter) — requires the caller's own API key ----

export async function streamChatCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    webSearch?: boolean;
    onDelta: (text: string) => void;
  }
): Promise<CompletionResult> {
  if (!apiKey) throw new MissingApiKeyError();
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(apiKey),
    signal: opts.signal,
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      stream: true,
      ...(opts.webSearch ? { plugins: [{ id: "web" }] } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let promptTokens = 0;
  let completionTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          opts.onDelta(delta);
        }
        if (json.usage) {
          promptTokens = json.usage.prompt_tokens ?? promptTokens;
          completionTokens = json.usage.completion_tokens ?? completionTokens;
        }
      } catch {
        // ignore malformed SSE chunk (e.g. comment/keepalive lines)
      }
    }
  }

  if (!completionTokens) {
    // Fallback estimate when the provider doesn't report usage on stream end.
    completionTokens = Math.ceil(fullContent.length / 4);
  }

  return { content: fullContent, promptTokens, completionTokens };
}

export function estimateCost(model: OpenRouterModel, promptTokens: number, completionTokens: number): number {
  return promptTokens * model.pricing.prompt + completionTokens * model.pricing.completion;
}
