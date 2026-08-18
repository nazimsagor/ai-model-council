"use client";

import { useMemo, useState } from "react";
import { useModels } from "@/lib/client/useModels";
import type { OpenRouterModel } from "@/lib/types";

type SortKey = "overall" | "cheapest" | "context" | "reasoning";
type CostFilter = "all" | "free" | "paid";

const FLAGSHIP_HINTS = [
  "gpt-4o", "gpt-4.1", "gpt-5", "o1", "o3", "o4",
  "claude-3.7-sonnet", "claude-sonnet-4", "claude-opus-4", "claude-3.5-sonnet",
  "gemini-2.0", "gemini-2.5", "gemini-1.5-pro",
  "deepseek-r1", "deepseek-v3", "llama-3.3", "llama-4",
  "qwen2.5", "qwen3", "grok-2", "grok-3", "grok-4",
];

function overallScore(m: OpenRouterModel): number {
  const idLower = m.id.toLowerCase();
  let score = FLAGSHIP_HINTS.some((h) => idLower.includes(h)) ? 5 : 0;
  score += m.capabilities.reasoning ? 1 : 0;
  score += m.capabilities.tools ? 1 : 0;
  score += Math.min(m.contextLength / 200_000, 1);
  return score;
}

function formatPrice(perToken: number): string {
  const perMillion = perToken * 1_000_000;
  if (perMillion === 0) return "Free";
  if (perMillion < 0.01) return "<$0.01/M";
  return `$${perMillion.toFixed(2)}/M`;
}

function formatContext(tokens: number): string {
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

export function ModelExplorer() {
  const { models, providers, loading, error } = useModels();
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [requireVision, setRequireVision] = useState(false);
  const [requireTools, setRequireTools] = useState(false);
  const [requireReasoning, setRequireReasoning] = useState(false);
  const [cost, setCost] = useState<CostFilter>("all");
  const [sort, setSort] = useState<SortKey>("overall");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = models.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (requireVision && !m.capabilities.vision) return false;
      if (requireTools && !m.capabilities.tools) return false;
      if (requireReasoning && !m.capabilities.reasoning) return false;
      const isFree = m.pricing.prompt === 0 && m.pricing.completion === 0;
      if (cost === "free" && !isFree) return false;
      if (cost === "paid" && isFree) return false;
      if (q && !m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "cheapest":
          return a.pricing.completion - b.pricing.completion;
        case "context":
          return b.contextLength - a.contextLength;
        case "reasoning":
          return Number(b.capabilities.reasoning) - Number(a.capabilities.reasoning) || overallScore(b) - overallScore(a);
        default:
          return overallScore(b) - overallScore(a);
      }
    });
    return list;
  }, [models, query, provider, requireVision, requireTools, requireReasoning, cost, sort]);

  if (loading) {
    return <p className="px-6 py-10 text-center text-[13px] text-muted">Loading OpenRouter catalog…</p>;
  }
  if (error) {
    return <p className="px-6 py-10 text-center text-[13px] text-danger">Failed to load models: {error}</p>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-[20px] font-semibold tracking-tight">Model Explorer</h1>
      <p className="mb-4 text-[13px] text-muted">
        {models.length} models available live from OpenRouter, grouped and filterable by provider and
        capability.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models…"
          className="w-56 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
        />
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px]"
        >
          <option value="all">All providers ({providers.length})</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px]"
        >
          <option value="overall">Sort: Best</option>
          <option value="cheapest">Sort: Price (cheapest first)</option>
          <option value="context">Sort: Longest context</option>
          <option value="reasoning">Sort: Best reasoning</option>
        </select>
        <div className="flex overflow-hidden rounded-md border border-border text-[12px]">
          {(["all", "free", "paid"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCost(c)}
              className={`px-2.5 py-1.5 capitalize transition-colors ${
                cost === c ? "bg-accent-soft text-accent-text" : "text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <FilterToggle label="Vision" active={requireVision} onClick={() => setRequireVision((v) => !v)} />
        <FilterToggle label="Tools" active={requireTools} onClick={() => setRequireTools((v) => !v)} />
        <FilterToggle label="Reasoning" active={requireReasoning} onClick={() => setRequireReasoning((v) => !v)} />
        <span className="text-[12px] text-muted-2">{filtered.length} results</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted-2">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Context</th>
              <th className="px-3 py-2 font-medium">Prompt</th>
              <th className="px-3 py-2 font-medium">Completion</th>
              <th className="px-3 py-2 font-medium">Capabilities</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface">
                <td className="max-w-[280px] px-3 py-2">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="truncate font-mono text-[11px] text-muted-2">{m.id}</div>
                </td>
                <td className="px-3 py-2 capitalize text-muted">{m.provider}</td>
                <td className="px-3 py-2 font-mono text-muted">{formatContext(m.contextLength)}</td>
                <td className="px-3 py-2 font-mono text-muted">{formatPrice(m.pricing.prompt)}</td>
                <td className="px-3 py-2 font-mono text-muted">{formatPrice(m.pricing.completion)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {m.capabilities.vision && <Badge label="vision" />}
                    {m.capabilities.tools && <Badge label="tools" />}
                    {m.capabilities.reasoning && <Badge label="reasoning" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-muted">No models match these filters.</p>
        )}
      </div>
    </div>
  );
}

function FilterToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-[12px] ${
        active ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">{label}</span>
  );
}
