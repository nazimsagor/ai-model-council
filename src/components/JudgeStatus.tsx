"use client";

import { ProviderIcon } from "@/components/ProviderIcon";
import { Icon, ICON_PATHS } from "@/components/icons";
import type { ModelEvaluation, OpenRouterModel } from "@/lib/types";

type JudgeStatusKind = "queued" | "judging" | "synthesizing" | "complete" | "failed";

const STATUS_META: Record<JudgeStatusKind, { label: string; color: string; dot: string }> = {
  queued: { label: "Waiting to judge…", color: "text-muted-2", dot: "border border-current" },
  judging: { label: "Judging…", color: "text-accent-text", dot: "bg-accent pulse-dot" },
  synthesizing: { label: "Synthesizing verdict…", color: "text-accent-text", dot: "bg-accent pulse-dot" },
  complete: { label: "Judged successfully", color: "text-success", dot: "" },
  failed: { label: "Judge failed", color: "text-danger", dot: "" },
};

/** Shown above the debater StatusBoard for Council runs — the judge never
 *  gets its own "status" SSE events the way debaters do (it's a separate
 *  phase, not a tracked model), so this derives a status from run phase +
 *  notices instead, and resolves which model actually judged from the first
 *  evaluation once one lands (the judge picked server-side via selectJudges
 *  isn't otherwise visible to the client unless the user picked one
 *  themselves ahead of the run). */
export function JudgeStatus({
  judgeModelId,
  models = [],
  phase,
  evaluations,
  notices,
}: {
  judgeModelId: string | null;
  models?: OpenRouterModel[];
  phase: string;
  evaluations: ModelEvaluation[];
  notices: string[];
}) {
  const judgeFailedNotice = notices.some((n) => /judge/i.test(n) && /fail/i.test(n));
  const displayJudgeId = judgeModelId ?? evaluations[0]?.judgeModelId?.split(" + ")[0]?.trim() ?? null;

  let status: JudgeStatusKind = "queued";
  if (phase === "evaluating") status = "judging";
  else if (phase === "synthesizing") status = "synthesizing";
  else if (phase === "done") status = evaluations.length > 0 ? "complete" : "failed";
  else if (judgeFailedNotice) status = "failed";

  const meta = STATUS_META[status];
  const judgeModel = displayJudgeId ? models.find((m) => m.id === displayJudgeId) : undefined;
  // Falls back to deriving the provider from the id string itself
  // ("openai/gpt-5" -> "openai") when the full catalog isn't available —
  // e.g. on the History detail page, which doesn't fetch it.
  const judgeProvider = judgeModel?.provider ?? displayJudgeId?.split("/")[0] ?? "?";

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <ProviderIcon provider={judgeProvider} className="h-7 w-7" />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Judge</div>
          <div className="truncate text-[13px] font-medium text-foreground">
            {judgeModel?.name ?? displayJudgeId ?? "Not yet assigned"}
          </div>
        </div>
      </div>
      <span className={`flex shrink-0 items-center gap-1.5 text-[12px] font-medium ${meta.color}`}>
        {status === "complete" ? (
          <Icon path={ICON_PATHS.check} className="h-3.5 w-3.5" />
        ) : status === "failed" ? (
          <Icon path={ICON_PATHS.close} className="h-3.5 w-3.5" />
        ) : (
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        )}
        {meta.label}
      </span>
    </div>
  );
}
