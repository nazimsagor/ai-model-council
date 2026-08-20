"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProviderIcon } from "@/components/ProviderIcon";
import type { ModelState } from "@/lib/client/runState";
import type { OpenRouterModel } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  streaming: "Thinking…",
  complete: "Complete",
  failed: "Failed",
  timeout: "Timed out",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-background text-muted-2",
  streaming: "bg-accent-soft text-accent-text",
  complete: "bg-success-soft text-success",
  failed: "bg-danger-soft text-danger",
  timeout: "bg-danger-soft text-danger",
};

export function SingleResponseView({
  modelId,
  state,
  models = [],
  onSecondOpinion,
  onCouncilReview,
  onOrchestrate,
  onRetry,
}: {
  modelId: string;
  state: ModelState;
  models?: OpenRouterModel[];
  onSecondOpinion?: () => void;
  onCouncilReview?: () => void;
  onOrchestrate?: () => void;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const model = models.find((m) => m.id === modelId);
  const provider = model?.provider ?? modelId.split("/")[0] ?? "?";
  const displayName = model?.name ?? modelId;
  const finished = state.status === "complete" || state.status === "failed" || state.status === "timeout";

  function handleCopy() {
    navigator.clipboard
      .writeText(state.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProviderIcon provider={provider} className="h-8 w-8" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold" title={modelId}>
              {displayName}
            </div>
            <div className="text-[11px] text-muted-2">Chat answer</div>
          </div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[state.status] ?? "bg-background text-muted-2"}`}
        >
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

      {finished && (onRetry || state.content || onSecondOpinion || onCouncilReview || onOrchestrate) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-2.5">
          {state.content && (
            <button
              onClick={handleCopy}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-border-strong"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Retry
            </button>
          )}
          {(onSecondOpinion || onCouncilReview || onOrchestrate) && (
            <>
              <span className="h-3.5 w-px bg-border" />
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
