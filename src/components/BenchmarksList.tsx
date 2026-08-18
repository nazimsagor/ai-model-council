"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BenchmarkSummary } from "@/lib/types";
import { Icon, ICON_PATHS } from "@/components/icons";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function BenchmarksList() {
  const router = useRouter();
  const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetch("/api/benchmarks")
      .then((r) => r.json())
      .then((json) => setBenchmarks(json.benchmarks ?? []))
      .catch(() => setBenchmarks([]));
  }

  useEffect(load, []);

  async function handleCreate() {
    setError(null);
    const cleanQuestions = questions.map((q) => q.trim()).filter(Boolean);
    if (!name.trim()) {
      setError("Give this benchmark a name.");
      return;
    }
    if (cleanQuestions.length === 0) {
      setError("Add at least one question.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), questions: cleanQuestions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create benchmark");
      router.push(`/benchmarks/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/benchmarks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-[20px] font-semibold tracking-tight">Benchmarks</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon path={ICON_PATHS.plus} className="h-3.5 w-3.5" />
            New benchmark
          </button>
        )}
      </div>
      <p className="mb-5 text-[13px] text-muted">
        Write your own question set, run it against any models you choose, and compare accuracy, reasoning, speed,
        and cost. This is a benchmark of your questions, not a universal model ranking.
      </p>

      {creating && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <label className="mb-3 flex flex-col gap-1">
            <span className="text-[12px] font-medium text-muted">Benchmark name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coding Benchmark"
              className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </label>

          <span className="mb-1.5 block text-[12px] font-medium text-muted">Questions</span>
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-[11px] text-muted-2">{i + 1}.</span>
                <textarea
                  value={q}
                  onChange={(e) => {
                    const next = [...questions];
                    next[i] = e.target.value;
                    setQuestions(next);
                  }}
                  rows={2}
                  placeholder="Question prompt…"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
                {questions.length > 1 && (
                  <button
                    onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                    className="mt-2 shrink-0 text-muted-2 hover:text-danger"
                    aria-label="Remove question"
                  >
                    <Icon path={ICON_PATHS.close} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setQuestions([...questions, ""])}
            className="mt-2 text-[12px] font-medium text-accent-text hover:underline"
          >
            + Add question
          </button>

          {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create benchmark"}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-full border border-border px-4 py-2 text-[13px] text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {benchmarks === null && <p className="text-[13px] text-muted">Loading…</p>}

      {benchmarks?.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
          <p className="text-[13px] text-muted">No benchmarks yet. Create one to test models against your own questions.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {benchmarks?.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
          >
            <Link href={`/benchmarks/${b.id}`} className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-foreground">{b.name}</div>
              <div className="text-[12px] text-muted-2">
                {b.questionCount} question{b.questionCount === 1 ? "" : "s"} · Created {formatDate(b.createdAt)}
                {b.lastRunAt && ` · Last run with ${b.lastRunModelCount} models ${formatDate(b.lastRunAt)}`}
              </div>
            </Link>
            <button
              onClick={() => handleDelete(b.id)}
              className="ml-3 shrink-0 rounded-md px-2 py-1 text-[12px] text-muted-2 hover:bg-danger-soft hover:text-danger"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
