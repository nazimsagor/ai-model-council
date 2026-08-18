// Small per-provider accent colors for model avatars/badges — these represent
// each AI provider's own identity (not the app's brand), similar to showing
// colored file-type icons in a file explorer.
const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97757",
  google: "#4285f4",
  "google-vertex": "#4285f4",
  meta: "#0668e1",
  "meta-llama": "#0668e1",
  mistralai: "#fa520f",
  nvidia: "#76b900",
  cohere: "#39594d",
  deepseek: "#4d6bfe",
  qwen: "#6f42c1",
  "x-ai": "#000000",
  xai: "#000000",
  perplexity: "#20808d",
  microsoft: "#00a4ef",
  amazon: "#ff9900",
  poolside: "#5b5bf0",
  moonshotai: "#6b5bf0",
  "z-ai": "#1a1a1a",
  zai: "#1a1a1a",
  liquid: "#00c2a8",
  inception: "#c14fd6",
};

const FALLBACK_PALETTE = ["#8b7355", "#6b8e9f", "#9f6b8e", "#7a9f6b", "#9f8b6b", "#6b7a9f", "#a37b6b", "#6ba38f"];

/** Deterministic per-provider color so the same provider always gets the
 *  same badge color, even for providers outside the curated list above. */
export function providerColor(provider: string): string {
  const known = PROVIDER_COLORS[provider.toLowerCase()];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < provider.length; i++) hash = (hash * 31 + provider.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function providerInitials(provider: string): string {
  const parts = provider.split(/[-_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return provider.slice(0, 2).toUpperCase();
}

// Official domain per provider, used to fetch their real logo. Only
// providers with a real company/product site are listed — independent
// finetune orgs and community accounts fall back to the abstract glyph.
const PROVIDER_DOMAINS: Record<string, string> = {
  openai: "openai.com",
  anthropic: "anthropic.com",
  google: "google.com",
  "google-vertex": "google.com",
  meta: "meta.com",
  "meta-llama": "meta.com",
  mistralai: "mistral.ai",
  nvidia: "nvidia.com",
  cohere: "cohere.com",
  deepseek: "deepseek.com",
  qwen: "qwen.ai",
  "x-ai": "x.ai",
  xai: "x.ai",
  perplexity: "perplexity.ai",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  poolside: "poolside.ai",
  moonshotai: "moonshot.ai",
  "z-ai": "z.ai",
  zai: "z.ai",
  liquid: "liquid.ai",
  inception: "inceptionlabs.ai",
  ai21: "ai21.com",
  allenai: "allenai.org",
  nousresearch: "nousresearch.com",
  "arcee-ai": "arcee.ai",
  morph: "morphllm.com",
  relace: "relace.ai",
  sakana: "sakana.ai",
  "ibm-granite": "ibm.com",
  thinkingmachines: "thinkingmachines.ai",
  openrouter: "openrouter.ai",
  baidu: "baidu.com",
  bytedance: "bytedance.com",
  "bytedance-seed": "bytedance.com",
  tencent: "tencent.com",
  minimax: "minimax.io",
  stepfun: "stepfun.com",
  rekaai: "reka.ai",
  xiaomi: "xiaomi.com",
};

/** Official domain for a provider's logo, or null if there isn't a real
 *  company site to fetch one from (independent/community accounts). */
export function providerDomain(provider: string): string | null {
  return PROVIDER_DOMAINS[provider.toLowerCase()] ?? null;
}
