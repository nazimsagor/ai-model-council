"use client";

import { Icon, ICON_PATHS } from "@/components/icons";
import type { ModelState } from "@/lib/client/runState";
import type { ModelRunStatus } from "@/lib/types";

function StatusGlyph({ status }: { status: ModelRunStatus }) {
  if (status === "complete") return <Icon path={ICON_PATHS.check} className="h-3 w-3" />;
  if (status === "failed" || status === "timeout") return <Icon path={ICON_PATHS.close} className="h-3 w-3" />;
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${status === "streaming" ? "bg-accent pulse-dot" : "border border-current"}`}
    />
  );
}

const STATUS_COLOR: Record<string, string> = {
  pending: "text-muted-2",
  streaming: "text-accent-text",
  complete: "text-success",
  failed: "text-danger",
  timeout: "text-danger",
};

export function StatusBoard({
  order,
  modelStates,
  label = "AI Model Council",
}: {
  order: string[];
  modelStates: Record<string, ModelState>;
  label?: string;
}) {
  const doneCount = order.filter((id) => {
    const s = modelStates[id]?.status;
    return s === "complete" || s === "failed" || s === "timeout";
  }).length;

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[12px] text-muted">
        <span className="font-semibold uppercase tracking-wide text-muted-2">{label}</span>
        <span>
          {doneCount}/{order.length} complete
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((id) => {
          const state = modelStates[id];
          const status = state?.status ?? "pending";
          return (
            <div key={id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate text-muted" title={id}>
                {id}
              </span>
              <span className={`flex shrink-0 items-center gap-1.5 ${STATUS_COLOR[status]}`}>
                <StatusGlyph status={status} />
                <span className="hidden sm:inline">
                  {status === "streaming" ? "Thinking…" : status === "pending" ? "Queued" : status === "complete" ? "Complete" : "Failed"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
