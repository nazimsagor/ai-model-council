"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ModelState } from "@/lib/client/runState";

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  streaming: "Thinking…",
  complete: "Complete",
  failed: "Failed",
  timeout: "Timed out",
};

export function SingleResponseView({
  modelId,
  state,
  onSecondOpinion,
  onCouncilReview,
  onOrchestrate,
}: {
  modelId: string;
  state: ModelState;
  onSecondOpinion?: () => void;
  onCouncilReview?: () => void;
  onOrchestrate?: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-[13px] font-semibold">{modelId}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted">
          {state.status === "streaming" && <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />}
          {STATUS_LABEL[state.status] ?? state.status}
        </span>
      </div>

      <div className="px-5 py-4 text-[15px] leading-relaxed">
        {state.status === "failed" || state.status === "timeout" ? (
          <p className="text-danger">{state.error ?? "This model failed to respond."}</p>
        ) : state.content ? (
          <div className="prose max-w-none [&_a]:text-accent-text [&_code]:rounded [&_code]:bg-accent-soft [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-accent-soft [&_pre]:p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-2">Waiting for response…</p>
        )}
      </div>

      {(state.latencyMs || state.cost) && (
        <div className="flex items-center justify-between border-t border-border px-5 py-2 text-[11px] text-muted-2">
          <span>{state.latencyMs ? `${(state.latencyMs / 1000).toFixed(1)}s` : "—"}</span>
          <span>{state.cost ? `$${state.cost.toFixed(4)}` : "$0.0000"}</span>
        </div>
      )}

      {state.status === "complete" && (onSecondOpinion || onCouncilReview || onOrchestrate) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-2.5">
          <span className="text-[11px] font-medium text-muted-2">Double-check:</span>
          {onSecondOpinion && (
            <button
              onClick={onSecondOpinion}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Second opinion
            </button>
          )}
          {onCouncilReview && (
            <button
              onClick={onCouncilReview}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Council review
            </button>
          )}
          {onOrchestrate && (
            <button
              onClick={onOrchestrate}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Orchestrator
            </button>
          )}
        </div>
      )}
    </div>
  );
}
