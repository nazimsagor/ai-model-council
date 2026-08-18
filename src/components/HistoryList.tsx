"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RunListItem } from "@/lib/repository";

export function HistoryList() {
  const [runs, setRuns] = useState<RunListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/history")
      .then((res) => res.json())
      .then((json) => setRuns(json.runs ?? []))
      .catch((err) => setError(String(err)));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this council run permanently?")) return;
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-[20px] font-semibold tracking-tight">History</h1>

      {error && <p className="text-[13px] text-danger">Failed to load history: {error}</p>}
      {runs === null && !error && <p className="text-[13px] text-muted">Loading…</p>}
      {runs?.length === 0 && (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-[13px] text-muted">
          No council runs yet. Ask something on the{" "}
          <Link href="/" className="text-accent-text underline">
            Council
          </Link>{" "}
          page to get started.
        </p>
      )}

      <div className="space-y-2">
        {runs?.map((run) => (
          <Link
            key={run.id}
            href={`/history/${run.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{run.prompt}</p>
              <p className="mt-0.5 text-[11px] text-muted-2">
                {new Date(run.createdAt).toLocaleString()} · {run.modelCount} models · $
                {run.totalCost.toFixed(4)}
                {run.topModelId && <> · winner: {run.topModelId.split("/").pop()}</>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] ${
                  run.status === "complete"
                    ? "bg-success-soft text-success"
                    : run.status === "failed"
                      ? "bg-danger-soft text-danger"
                      : "bg-warning-soft text-warning"
                }`}
              >
                {run.status}
              </span>
              <button
                onClick={(e) => handleDelete(run.id, e)}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:text-danger"
              >
                Delete
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
