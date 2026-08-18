"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RankBadge } from "@/components/RankBadge";
import type { ModelEvaluation, EvaluationScores } from "@/lib/types";
import type { ModelState } from "@/lib/client/runState";

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  streaming: "Thinking…",
  complete: "Complete",
  failed: "Failed",
  timeout: "Timed out",
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === "complete"
      ? "bg-success"
      : status === "failed" || status === "timeout"
        ? "bg-danger"
        : status === "streaming"
          ? "bg-accent pulse-dot"
          : "bg-muted-2";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function scoreColor(total: number): string {
  if (total >= 85) return "text-success";
  if (total >= 65) return "text-warning";
  return "text-danger";
}

function formatCost(cost?: number): string {
  if (!cost) return "$0.0000";
  return `$${cost.toFixed(4)}`;
}

export function ResponseCard({
  modelId,
  state,
  evaluation,
  rank,
}: {
  modelId: string;
  state: ModelState;
  evaluation?: ModelEvaluation;
  rank?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {rank !== undefined && rank <= 2 && <RankBadge rank={rank as 0 | 1 | 2} />}
          <span className="truncate text-[13px] font-medium" title={modelId}>
            {modelId}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
          <StatusDot status={state.status} />
          {STATUS_LABEL[state.status] ?? state.status}
        </div>
      </div>

      {evaluation && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className={`font-mono text-sm font-semibold ${scoreColor(evaluation.total)}`}>
            {evaluation.total.toFixed(1)}/100
          </span>
          <span className="text-[11px] text-muted-2">judged by {evaluation.judgeModelId.split("/").pop()}</span>
        </div>
      )}

      <div className="scrollbar-thin max-h-80 overflow-y-auto px-3 py-2 text-[13px] leading-relaxed">
        {state.status === "failed" || state.status === "timeout" ? (
          <p className="text-danger">{state.error ?? "This model failed to respond."}</p>
        ) : state.content ? (
          <div className="prose-sm max-w-none [&_a]:text-accent-text [&_code]:rounded [&_code]:bg-accent-soft [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-accent-soft [&_pre]:p-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-2">Waiting for response…</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-2">
        <span>{state.latencyMs ? `${(state.latencyMs / 1000).toFixed(1)}s` : "—"}</span>
        <span>{formatCost(state.cost)}</span>
      </div>

      {evaluation && <ScoreBreakdown scores={evaluation.scores} />}
    </div>
  );
}

const DIM_LABELS: Record<keyof EvaluationScores, string> = {
  accuracy: "Accuracy",
  reasoning: "Reasoning",
  completeness: "Completeness",
  relevance: "Relevance",
  clarity: "Clarity",
  technicalCorrectness: "Technical",
  factualReliability: "Reliability",
  instructionFollowing: "Instructions",
  usefulness: "Usefulness",
  originality: "Originality",
};

function ScoreBreakdown({ scores }: { scores: EvaluationScores }) {
  return (
    <details className="border-t border-border px-3 py-1.5 text-[11px]">
      <summary className="cursor-pointer text-muted-2">Score breakdown</summary>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {(Object.keys(DIM_LABELS) as (keyof EvaluationScores)[]).map((dim) => (
          <div key={dim} className="flex items-center justify-between">
            <span className="text-muted">{DIM_LABELS[dim]}</span>
            <span className="font-mono">{scores[dim].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
