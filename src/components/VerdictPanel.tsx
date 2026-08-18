"use client";

import { CollapsibleMarkdown } from "@/components/CollapsibleMarkdown";
import { RankBadge } from "@/components/RankBadge";
import type { CouncilRunSummary } from "@/lib/types";

function confidenceColor(confidence: number): string {
  if (confidence >= 75) return "bg-success";
  if (confidence >= 45) return "bg-warning";
  return "bg-danger";
}

function confidenceTextColor(confidence: number): string {
  if (confidence >= 75) return "text-success";
  if (confidence >= 45) return "text-warning";
  return "text-danger";
}

export function VerdictPanel({ summary, modelCount }: { summary: CouncilRunSummary; modelCount: number }) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface-raised">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
          Council Verdict
        </span>
        <span className="text-[11px] text-muted-2">
          {modelCount} model{modelCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="px-5 py-4">
        <CollapsibleMarkdown
          content={summary.finalAnswer}
          maxHeight={420}
          className="prose-sm max-w-none text-[14px] leading-relaxed [&_a]:text-accent-text [&_code]:rounded [&_code]:bg-accent-soft [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-accent-soft [&_pre]:p-2"
          fadeClassName="from-surface-raised to-transparent"
        />
      </div>

      {summary.whyChosen.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">Why</h3>
          <ol className="space-y-2">
            {summary.whyChosen.map((reason, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-foreground">
                <span className="font-mono text-[12px] text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                <span>{reason}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 border-t border-border px-5 py-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
            AI Council Confidence
          </h3>
          <div className={`font-heading text-[36px] leading-none ${confidenceTextColor(summary.confidence)}`}>
            {summary.confidence}%
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full ${confidenceColor(summary.confidence)}`}
              style={{ width: `${summary.confidence}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-2">{summary.confidenceReason}</p>
          <p className="mt-1 text-[10px] text-muted-2">
            Reflects agreement among models &amp; judges — not a guarantee of factual correctness.
          </p>
        </div>

        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">Top Models</h3>
          <ol className="space-y-1.5 text-[13px]">
            {summary.topModelIds.map((id, i) => (
              <li key={id} className="flex items-center gap-2 truncate">
                {i <= 2 ? <RankBadge rank={i as 0 | 1 | 2} /> : <span className="w-4 text-center text-muted-2">·</span>}
                <span className="truncate">{id}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
