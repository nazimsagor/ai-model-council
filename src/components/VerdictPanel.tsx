"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon, ICON_PATHS } from "@/components/icons";
import { RankBadge } from "@/components/RankBadge";
import type { CouncilRunSummary } from "@/lib/types";

function confidenceColor(confidence: number): string {
  if (confidence >= 75) return "bg-success";
  if (confidence >= 45) return "bg-warning";
  return "bg-danger";
}

export function VerdictPanel({ summary, modelCount }: { summary: CouncilRunSummary; modelCount: number }) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface-raised">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <Icon path={ICON_PATHS.trophy} className="h-4 w-4 text-accent" />
          Council Verdict
        </h2>
        <span className="text-[12px] text-muted">Based on {modelCount} model{modelCount === 1 ? "" : "s"}</span>
      </div>

      <div className="px-4 py-3">
        <div className="prose-sm max-w-none text-[14px] leading-relaxed [&_a]:text-accent [&_code]:rounded [&_code]:bg-accent-soft [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-accent-soft [&_pre]:p-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.finalAnswer}</ReactMarkdown>
        </div>
      </div>

      {summary.whyChosen.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">
            Why the council chose this
          </h3>
          <ul className="space-y-1 text-[13px] text-foreground">
            {summary.whyChosen.map((reason, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-3 sm:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">
            Council Confidence
          </h3>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full ${confidenceColor(summary.confidence)}`}
                style={{ width: `${summary.confidence}%` }}
              />
            </div>
            <span className="font-mono text-[13px] font-semibold">{summary.confidence}%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-2">{summary.confidenceReason}</p>
          <p className="mt-1 text-[10px] text-muted-2">
            Reflects agreement among models &amp; judges — not a guarantee of factual correctness.
          </p>
        </div>

        <div>
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Top Models</h3>
          <ol className="space-y-1 text-[13px]">
            {summary.topModelIds.map((id, i) => (
              <li key={id} className="flex items-center gap-1.5 truncate">
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
