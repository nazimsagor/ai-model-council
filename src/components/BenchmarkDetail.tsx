"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppSettings } from "@/lib/client/appSettings";
import { useModels } from "@/lib/client/useModels";
import { ModelPickerModal } from "@/components/ModelPickerModal";
import { Icon, ICON_PATHS } from "@/components/icons";
import type { Benchmark, BenchmarkModelAggregate } from "@/lib/types";

function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function AggregateTable({ aggregates, models }: { aggregates: BenchmarkModelAggregate[]; models: Map<string, string> }) {
  const sorted = [...aggregates].sort((a, b) => b.overallScore - a.overallScore);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted-2">
          <tr>
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">Accuracy</th>
            <th className="px-3 py-2 font-medium">Reasoning</th>
            <th className="px-3 py-2 font-medium">Speed</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-3 py-2 font-medium">Overall</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a, i) => (
            <tr key={a.modelId} className="border-b border-border last:border-0">
              <td className="max-w-[240px] px-3 py-2">
                <div className="flex items-center gap-1.5 truncate font-medium">
                  {i === 0 && <Icon path={ICON_PATHS.trophy} className="h-3.5 w-3.5 shrink-0 text-accent" />}
                  {models.get(a.modelId) ?? a.modelId}
                </div>
                {a.questionsFailed > 0 && (
                  <div className="text-[11px] text-danger">{a.questionsFailed} question(s) failed</div>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-muted">{a.avgAccuracy.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono text-muted">{a.avgReasoning.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono text-muted">{a.avgLatencyMs ? `${(a.avgLatencyMs / 1000).toFixed(1)}s` : "—"}</td>
              <td className="px-3 py-2 font-mono text-muted">{formatCost(a.totalCost)}</td>
              <td className="px-3 py-2">
                <span className="font-mono text-[14px] font-semibold text-accent-text">{a.overallScore.toFixed(1)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BenchmarkDetail({ benchmarkId }: { benchmarkId: string }) {
  const { apiKey, hasApiKey, openKeyModal } = useAppSettings();
  const { models } = useModels();
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  function load() {
    fetch(`/api/benchmarks/${benchmarkId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setNotFound(true);
          return;
        }
        setBenchmark(json.benchmark);
        if (json.benchmark?.latestRun?.modelIds?.length) {
          setSelected(new Set(json.benchmark.latestRun.modelIds));
        }
      });
  }

  useEffect(load, [benchmarkId]);

  const modelNames = new Map(models.map((m) => [m.id, m.name]));

  async function handleRun() {
    if (!hasApiKey) {
      openKeyModal();
      return;
    }
    if (selected.size < 2) {
      setError("Select at least 2 models to compare.");
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const res = await fetch(`/api/benchmarks/${benchmarkId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-openrouter-key": apiKey },
        body: JSON.stringify({ modelIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Benchmark run failed");
      setBenchmark(json.benchmark);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  if (notFound) {
    return <p className="px-6 py-10 text-center text-[13px] text-muted">Benchmark not found.</p>;
  }
  if (!benchmark) {
    return <p className="px-6 py-10 text-center text-[13px] text-muted">Loading…</p>;
  }

  const run = benchmark.latestRun;

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
      <Link href="/benchmarks" className="mb-3 inline-block text-[12px] text-muted hover:text-foreground">
        ← Benchmarks
      </Link>
      <h1 className="mb-1 text-[20px] font-semibold tracking-tight">{benchmark.name}</h1>
      <p className="mb-5 text-[13px] text-muted">
        {benchmark.questions.length} question{benchmark.questions.length === 1 ? "" : "s"}
      </p>

      <div className="mb-5 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted">Models to compare</span>
          <button onClick={() => setPickerOpen(true)} className="text-[12px] font-medium text-accent-text hover:underline">
            {selected.size > 0 ? "Change" : "Select models"}
          </button>
        </div>
        {selected.size === 0 ? (
          <p className="text-[12px] text-muted-2">No models selected yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selected).map((id) => (
              <span key={id} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                {modelNames.get(id) ?? id}
              </span>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}

        <button
          onClick={handleRun}
          disabled={running}
          className="mt-4 flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {running ? "Running against every question…" : run ? "Run again" : "Run benchmark"}
        </button>
      </div>

      {run && (
        <>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-2">Results</h2>
          <div className="mb-5">
            <AggregateTable aggregates={run.aggregates} models={modelNames} />
          </div>

          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-2">Per-question breakdown</h2>
          <div className="flex flex-col gap-2">
            {run.questionResults.map((qr) => (
              <div key={qr.questionId} className="rounded-lg border border-border bg-surface">
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === qr.questionId ? null : qr.questionId)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px]"
                >
                  <span className="truncate pr-3">{qr.prompt}</span>
                  <Icon
                    path={ICON_PATHS.arrowUp}
                    className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${
                      expandedQuestion === qr.questionId ? "" : "rotate-180"
                    }`}
                  />
                </button>
                {expandedQuestion === qr.questionId && (
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex flex-col gap-3">
                      {qr.results.map((r) => (
                        <div key={r.modelId} className="rounded-md border border-border bg-background p-3">
                          <div className="mb-1 flex items-center justify-between text-[12px]">
                            <span className="font-medium text-foreground">{modelNames.get(r.modelId) ?? r.modelId}</span>
                            {r.total !== undefined && (
                              <span className="font-mono text-accent-text">{r.total.toFixed(1)}/100</span>
                            )}
                          </div>
                          {r.status === "complete" ? (
                            <p className="whitespace-pre-wrap text-[12px] text-muted">{r.content}</p>
                          ) : (
                            <p className="text-[12px] text-danger">Error: {r.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <ModelPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select models"
        subtitle="Choose 2–7 models to benchmark"
        models={models}
        selected={selected}
        onToggle={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        singleSelect={false}
      />
    </div>
  );
}
