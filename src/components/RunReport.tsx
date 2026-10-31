"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResponseCard } from "@/components/ResponseCard";
import { JudgeStatus } from "@/components/JudgeStatus";
import { VerdictPanel } from "@/components/VerdictPanel";
import { DisagreementList } from "@/components/DisagreementList";
import { CostSpeedSummary } from "@/components/CostSpeedSummary";
import { SingleResponseView } from "@/components/SingleResponseView";
import type { CouncilRun } from "@/lib/types";
import type { ModelState } from "@/lib/client/runState";

// A saved Chat conversation: each run (first message, then follow-ups) as a
// user bubble and the model's answer, top to bottom.
function ChatTranscript({ turns }: { turns: CouncilRun[] }) {
  return (
    <div className="space-y-4">
      {turns.map((turn) => {
        const result = turn.results[0];
        return (
          <div key={turn.id} className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-accent px-4 py-2.5 text-[13px] leading-snug text-on-accent shadow-sm">
                {turn.prompt}
              </div>
            </div>
            {result && (
              <SingleResponseView
                modelId={result.modelId}
                state={{
                  modelId: result.modelId,
                  status: result.status,
                  content: result.content,
                  error: result.error,
                  latencyMs: result.latencyMs,
                  cost: result.cost,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RunReport({ run, followUps = [] }: { run: CouncilRun; followUps?: CouncilRun[] }) {
  const router = useRouter();

  const modelStates: Record<string, ModelState> = {};
  for (const r of run.results) {
    modelStates[r.modelId] = {
      modelId: r.modelId,
      status: r.status,
      content: r.content,
      error: r.error,
      latencyMs: r.latencyMs,
      cost: r.cost,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
    };
  }
  const order = run.selectedModelIds.length ? run.selectedModelIds : run.results.map((r) => r.modelId);
  const sortedForDisplay = [...order].sort((a, b) => {
    const ea = run.evaluations.find((e) => e.modelId === a)?.total ?? -1;
    const eb = run.evaluations.find((e) => e.modelId === b)?.total ?? -1;
    return eb - ea;
  });

  async function handleDelete() {
    if (!confirm(run.workflow === "chat" ? "Delete this whole chat permanently?" : "Delete this council run permanently?"))
      return;
    await fetch(`/api/history/${run.id}`, { method: "DELETE" });
    router.push("/history");
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-2">
            {new Date(run.createdAt).toLocaleString()} ·{" "}
            {run.workflow === "chat" ? `chat · ${followUps.length + 1} messages` : `${run.mode} council · ${run.status}`}
          </p>
          <h1 className="mt-1 text-[18px] font-semibold leading-snug">{run.prompt}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          {run.workflow === "chat" && (
            <Link
              href={`/chat?continue=${run.id}`}
              className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent hover:bg-accent-hover"
            >
              Continue chat
            </Link>
          )}
          <button
            onClick={handleDelete}
            className="rounded-md border border-danger/40 px-3 py-1.5 text-[12px] text-danger hover:bg-danger-soft"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {run.workflow === "council" && (
          <JudgeStatus
            judgeModelId={run.judgeModelIds[0] ?? null}
            phase="done"
            evaluations={run.evaluations}
            notices={[]}
          />
        )}

        {run.summary && (
          <>
            <VerdictPanel summary={run.summary} modelCount={order.length} />
            <div>
              <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-2">
                Where Models Disagree
              </h3>
              <DisagreementList disagreements={run.summary.disagreements} />
            </div>
          </>
        )}

        {run.workflow === "chat" ? (
          <ChatTranscript turns={[run, ...followUps]} />
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {sortedForDisplay.map((id, i) => {
              const evalData = run.evaluations.find((e) => e.modelId === id);
              const state = modelStates[id];
              if (!state) return null;
              return (
                <ResponseCard
                  key={id}
                  modelId={id}
                  state={state}
                  evaluation={evalData}
                  rank={run.evaluations.length > 0 ? i : undefined}
                />
              );
            })}
          </div>
        )}

        <CostSpeedSummary
          order={order}
          modelStates={modelStates}
          totalCost={run.totalCost}
          totalTimeMs={run.totalTimeMs}
        />

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/history/${run.id}/export?format=markdown`}
            className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
          >
            Export Markdown
          </a>
          <a
            href={`/api/history/${run.id}/export?format=json`}
            className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
          >
            Export JSON
          </a>
        </div>
      </div>
    </div>
  );
}
