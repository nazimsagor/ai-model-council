"use client";

import { Icon, ICON_PATHS } from "@/components/icons";
import type { DisagreementItem } from "@/lib/types";

export function DisagreementList({ disagreements }: { disagreements: DisagreementItem[] }) {
  if (disagreements.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px] text-muted">
        No significant disagreements detected among the models.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {disagreements.map((d, i) => (
        <div key={i} className="rounded-lg border border-warning/30 bg-warning-soft/40 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-warning">
            <Icon path={ICON_PATHS.warning} className="h-4 w-4" />
            <span>Disagreement: {d.topic}</span>
          </div>
          <div className="mb-2 space-y-1">
            {d.positions.map((p, j) => (
              <div key={j} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="font-medium">{p.position}</span>
                <span className="text-[11px] text-muted-2">
                  — {p.modelIds.map((id) => id.split("/").pop()).join(", ")}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted">
            <span className="font-medium text-foreground">Council conclusion: </span>
            {d.councilConclusion}
          </p>
        </div>
      ))}
    </div>
  );
}
