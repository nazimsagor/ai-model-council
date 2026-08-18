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
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string; input_modalities?: string[] };
  supported_parameters?: string[];
}

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
  const models = json.data.map(parseModel).sort((a, b) => a.id.localeCompare(b.id));
  modelCache = { models, fetchedAt: Date.now() };
  return models;
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
