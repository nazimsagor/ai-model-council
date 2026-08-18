"use client";

import { useMemo, useState } from "react";
import type { OpenRouterModel } from "@/lib/types";

function formatPrice(perToken: number): string {
  const perMillion = perToken * 1_000_000;
  if (perMillion === 0) return "free";
  if (perMillion < 0.01) return "<$0.01/M";
  return `$${perMillion.toFixed(2)}/M`;
}

export function ModelPicker({
  models,
  selected,
  onToggle,
  maxVisibleHeight = "22rem",
  singleSelect = false,
}: {
  models: OpenRouterModel[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  maxVisibleHeight?: string;
  singleSelect?: boolean;
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? models.filter(
          (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
        )
      : models;
    const map = new Map<string, OpenRouterModel[]>();
    for (const m of filtered) {
      const list = map.get(m.provider) ?? [];
      list.push(m);
      map.set(m.provider, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [models, query]);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models…"
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
        />
      </div>
      <div className="scrollbar-thin overflow-y-auto p-1" style={{ maxHeight: maxVisibleHeight }}>
        {grouped.length === 0 && (
          <p className="p-4 text-center text-[13px] text-muted">No models match “{query}”.</p>
        )}
        {grouped.map(([provider, list]) => (
          <div key={provider} className="mb-1">
            <div className="sticky top-0 z-10 bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              {provider} <span className="text-muted-2/70">({list.length})</span>
            </div>
            {list.map((model) => {
              const isSelected = selected.has(model.id);
              return (
                <label
                  key={model.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent-soft ${
                    isSelected ? "bg-accent-soft" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type={singleSelect ? "radio" : "checkbox"}
                      name={singleSelect ? "model-picker-single" : undefined}
                      checked={isSelected}
                      onChange={() => onToggle(model.id)}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    <span className="truncate">{model.name}</span>
                    {model.capabilities.vision && (
                      <span className="rounded bg-info-soft px-1 text-[10px] text-info">vision</span>
                    )}
                    {model.capabilities.reasoning && (
                      <span className="rounded bg-warning-soft px-1 text-[10px] text-warning">reasoning</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-2">
                    {formatPrice(model.pricing.completion)}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
