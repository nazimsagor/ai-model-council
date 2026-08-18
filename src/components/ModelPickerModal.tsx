"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, ICON_PATHS } from "@/components/icons";
import { ProviderIcon } from "@/components/ProviderIcon";
import type { OpenRouterModel } from "@/lib/types";

type QuickFilter = "all" | "vision" | "reasoning" | "tools" | "free" | "context" | "cheap";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "Any task" },
  { id: "vision", label: "Vision" },
  { id: "reasoning", label: "Reasoning" },
  { id: "tools", label: "Tools" },
  { id: "free", label: "Free" },
  { id: "context", label: "Long context" },
  { id: "cheap", label: "Cheapest" },
];

// Recognizable major labs surface first in the provider pill row — an
// alphabetical-only list buries them behind smaller providers (Ai21,
// Aion-Labs, Allenai, ...) that happen to sort earlier, making it look like
// major labs are missing entirely.
const MAJOR_PROVIDER_ORDER = [
  "openai", "anthropic", "google", "x-ai", "meta-llama", "mistralai",
  "deepseek", "qwen", "amazon", "microsoft", "cohere", "perplexity", "nvidia",
];

/** Ranks models by real capability + price signals from the live catalog —
 *  no hardcoded model names, so this never goes stale as new versions ship
 *  (a substring list like "gpt-5"/"gemini-2.5" inevitably misses whatever
 *  ships next, e.g. a future "gemini-3.x"). Price is a meaningful signal
 *  here because within one family the pricier tier is consistently the more
 *  capable one (Opus > Sonnet > Haiku, Pro > Flash). ":batch" variants are
 *  async-only and not useful for interactive picking, so they're pushed
 *  below their equivalent interactive model despite being cheaper. */
function overallScore(m: OpenRouterModel): number {
  let score = 0;
  score += m.capabilities.reasoning ? 3 : 0;
  score += m.capabilities.tools ? 1 : 0;
  score += Math.min(m.contextLength / 500_000, 2);
  score += Math.min((m.pricing.completion * 1_000_000) / 50, 2);
  if (m.id.includes(":batch")) score -= 5;
  return score;
}

function formatPrice(perToken: number): string {
  if (perToken === 0) return "Free";
  const perMillion = perToken * 1_000_000;
  if (perMillion < 0.01) return "<$0.01/M";
  return `$${perMillion.toFixed(2)}/M`;
}

function formatContext(tokens: number): string {
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

export function ModelPickerModal({
  open,
  onClose,
  title,
  subtitle,
  models,
  selected,
  onToggle,
  singleSelect,
  defaultModelId,
  onSetDefault,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  models: OpenRouterModel[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  singleSelect: boolean;
  defaultModelId?: string | null;
  onSetDefault?: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [provider, setProvider] = useState("all");

  useEffect(() => {
    if (!open) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  const providers = useMemo(() => {
    const all = Array.from(new Set(models.map((m) => m.provider)));
    const major = MAJOR_PROVIDER_ORDER.filter((p) => all.includes(p));
    const rest = all.filter((p) => !MAJOR_PROVIDER_ORDER.includes(p)).sort();
    return [...major, ...rest];
  }, [models]);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const PROVIDER_PAGE_SIZE = 13;
  const visibleProviders = showAllProviders ? providers : providers.slice(0, PROVIDER_PAGE_SIZE);
  const hiddenProviderCount = providers.length - visibleProviders.length;

  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = models.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (q && !m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false;
      if (filter === "vision") return m.capabilities.vision;
      if (filter === "reasoning") return m.capabilities.reasoning;
      if (filter === "tools") return m.capabilities.tools;
      if (filter === "free") return m.pricing.prompt === 0 && m.pricing.completion === 0;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (filter === "context") return b.contextLength - a.contextLength;
      if (filter === "cheap") return a.pricing.completion - b.pricing.completion;
      return overallScore(b) - overallScore(a);
    });
    return list;
  }, [models, query, filter, provider]);

  useEffect(() => {
    const timer = setTimeout(() => setVisibleCount(PAGE_SIZE), 0);
    return () => clearTimeout(timer);
  }, [query, filter, provider]);

  const filtered = matched.slice(0, visibleCount);
  const hiddenCount = matched.length - filtered.length;

  const selectedModels = useMemo(() => models.filter((m) => selected.has(m.id)), [models, selected]);
  const singleSelectedId = singleSelect ? (selectedModels[0]?.id ?? null) : null;
  const isCurrentDefault = singleSelectedId !== null && singleSelectedId === defaultModelId;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border-strong bg-surface-raised shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <span className="text-[15px] font-semibold text-foreground">{title}</span>
            <span className="ml-2 text-[12px] text-muted-2">{subtitle}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <Icon path={ICON_PATHS.close} className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Icon path={ICON_PATHS.sparkle} className="h-3.5 w-3.5 text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${models.length} OpenRouter models…`}
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-2"
              autoFocus
            />
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">Good for</span>
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  filter === f.id ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">Provider</span>
            <button
              onClick={() => setProvider("all")}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                provider === "all" ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:text-foreground"
              }`}
            >
              All
            </button>
            {visibleProviders.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors ${
                  provider === p ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
            {hiddenProviderCount > 0 && (
              <button
                onClick={() => setShowAllProviders(true)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-2 hover:text-foreground"
              >
                +{hiddenProviderCount} more
              </button>
            )}
          </div>
        </div>

        {selectedModels.length > 0 && (
          <div className="border-b border-border px-5 py-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
              Selected model{selectedModels.length === 1 ? "" : "s"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedModels.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent-text"
                >
                  {m.name}
                  <Icon path={ICON_PATHS.check} className="h-3 w-3" />
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((m) => {
              const isSelected = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => onToggle(m.id)}
                  className={`relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left shadow-sm transition-all ${
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-background hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
                  }`}
                >
                  <ProviderIcon provider={m.provider} className="h-8 w-8" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-[13px] font-medium text-foreground">
                      {m.name}
                      {m.id === defaultModelId && <Icon path={ICON_PATHS.star} className="h-3 w-3 shrink-0 text-accent" filled />}
                    </span>
                    <span className="block truncate text-[11px] text-muted-2">
                      {m.id === defaultModelId
                        ? "Your default model"
                        : `${m.provider} · ${formatContext(m.contextLength)} · ${formatPrice(m.pricing.completion)}`}
                    </span>
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[13px] transition-colors ${
                      isSelected
                        ? "absolute -right-1.5 -top-1.5 border-2 border-background bg-accent text-on-accent"
                        : "border-border-strong text-muted-2"
                    }`}
                  >
                    {isSelected ? <Icon path={ICON_PATHS.check} className="h-3 w-3" /> : "+"}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-[13px] text-muted">No models match these filters.</p>
            )}
          </div>
          {hiddenCount > 0 && (
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="mt-3 w-full rounded-lg border border-dashed border-border-strong py-2 text-center text-[12px] text-muted hover:border-accent hover:text-accent-text"
            >
              Show {Math.min(hiddenCount, PAGE_SIZE)} more ({matched.length - filtered.length} of {matched.length} not shown)
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-[11px] text-muted-2">
            {singleSelect ? "This model will answer your next message." : `${selected.size} model${selected.size === 1 ? "" : "s"} selected.`}
            {" "}Showing {filtered.length} of {matched.length}.
          </span>
          <div className="flex items-center gap-3">
            {singleSelect && onSetDefault && singleSelectedId && (
              <button
                onClick={() => onSetDefault(isCurrentDefault ? null : singleSelectedId)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  isCurrentDefault
                    ? "border-accent bg-accent-soft text-accent-text"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                <Icon path={ICON_PATHS.star} className="h-3.5 w-3.5" filled={isCurrentDefault} />
                {isCurrentDefault ? "Default model" : "Set as default"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
