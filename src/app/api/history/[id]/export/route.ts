import { NextRequest, NextResponse } from "next/server";
import { getRun } from "@/lib/repository";
import { getCurrentUser } from "@/lib/subscription";
import type { CouncilRun } from "@/lib/types";

export const runtime = "nodejs";

function toMarkdown(run: CouncilRun): string {
  const lines: string[] = [];
  lines.push(`# AI Model Council Report`);
  lines.push("");
  lines.push(`**Prompt:** ${run.prompt}`);
  lines.push(`**Date:** ${run.createdAt}`);
  lines.push(`**Mode:** ${run.mode} | **Models:** ${run.selectedModelIds.length} | **Cost:** $${run.totalCost.toFixed(4)}`);
  lines.push("");
  if (run.summary) {
    lines.push(`## Council Verdict`);
    lines.push("");
    lines.push(run.summary.finalAnswer);
    lines.push("");
    lines.push(`**Confidence:** ${run.summary.confidence}% — ${run.summary.confidenceReason}`);
    lines.push("");
    if (run.summary.whyChosen.length) {
      lines.push(`### Why the council chose this`);
      for (const reason of run.summary.whyChosen) lines.push(`- ${reason}`);
      lines.push("");
    }
    if (run.summary.disagreements.length) {
      lines.push(`### Disagreements`);
      for (const d of run.summary.disagreements) {
        lines.push(`**${d.topic}**`);
        for (const p of d.positions) lines.push(`- ${p.position}: ${p.modelIds.join(", ")}`);
        lines.push(`_Council conclusion: ${d.councilConclusion}_`);
        lines.push("");
      }
    }
  }
  lines.push(`## Individual Model Responses`);
  for (const r of run.results) {
    const evalData = run.evaluations.find((e) => e.modelId === r.modelId);
    lines.push("");
    lines.push(`### ${r.modelId} ${evalData ? `— ${evalData.total}/100` : ""}`);
    lines.push(`Status: ${r.status} | Latency: ${r.latencyMs}ms | Cost: $${(r.cost ?? 0).toFixed(5)}`);
    lines.push("");
    lines.push(r.status === "complete" ? r.content : `_Error: ${r.error}_`);
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to export this run." }, { status: 401 });
  const run = await getRun(id, user.id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  if (format === "markdown") {
    return new Response(toMarkdown(run), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="council-${id}.md"`,
      },
    });
  }

  return new Response(JSON.stringify(run, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="council-${id}.json"`,
    },
  });
}
