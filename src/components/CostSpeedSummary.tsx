"use client";

import type { ModelState } from "@/lib/client/runState";

export function CostSpeedSummary({
  order,
  modelStates,
  totalCost,
  totalTimeMs,
}: {
  order: string[];
  modelStates: Record<string, ModelState>;
  totalCost: number;
  totalTimeMs: number;
}) {
  const timed = order
    .map((id) => ({ id, latency: modelStates[id]?.latencyMs }))
    .filter((x): x is { id: string; latency: number } => typeof x.latency === "number");
  const fastest = timed.length ? timed.reduce((a, b) => (b.latency < a.latency ? b : a)) : undefined;
  const slowest = timed.length ? timed.reduce((a, b) => (b.latency > a.latency ? b : a)) : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Council Cost" value={`$${totalCost.toFixed(4)}`} />
      <Stat label="Council Time" value={`${(totalTimeMs / 1000).toFixed(1)}s`} />
      <Stat label="Fastest" value={fastest ? `${(fastest.latency / 1000).toFixed(1)}s` : "—"} sub={fastest?.id.split("/").pop()} />
      <Stat label="Slowest" value={slowest ? `${(slowest.latency / 1000).toFixed(1)}s` : "—"} sub={slowest?.id.split("/").pop()} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-2">{label}</div>
      <div className="font-mono text-[15px] font-semibold">{value}</div>
      {sub && <div className="truncate text-[10px] text-muted-2">{sub}</div>}
    </div>
  );
}
