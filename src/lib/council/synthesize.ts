import { chatCompletion } from "../openrouter";
import { extractJson } from "./json";
import type { CouncilRunSummary, DisagreementItem, ModelEvaluation, ModelRunResult } from "../types";

function buildSynthesisPrompt(prompt: string, results: ModelRunResult[], evaluations: ModelEvaluation[]): string {
  const byModel = new Map(evaluations.map((e) => [e.modelId, e]));
  const responsesBlock = results
    .filter((r) => r.status === "complete" && r.content.trim())
    .map((r) => {
      const evalData = byModel.get(r.modelId);
      return `### ${r.modelId} (council score: ${evalData?.total ?? "n/a"}/100)\n${r.content}`;
    })
    .join("\n\n");

  return `You are the Council Synthesizer. Multiple AI models independently answered the same question. Your job:
1. Identify points of agreement across responses.
2. Identify meaningful disagreements or conflicting claims.
3. Determine the strongest reasoning and remove incorrect or unsupported claims.
4. Combine complementary insights into ONE final answer that is better than any single response.
5. Preserve concrete, useful examples where valuable.

ORIGINAL QUESTION:
${prompt}

MODEL RESPONSES (with their council evaluation score):
${responsesBlock}

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "finalAnswer": "the synthesized answer in markdown",
  "whyChosen": ["short bullet explaining a key reason", "another bullet", "..."],
  "disagreements": [
    { "topic": "short topic name", "positions": [{"position": "PostgreSQL", "modelIds": ["openai/gpt-4o"]}, {"position": "MongoDB", "modelIds": ["anthropic/claude-3.7-sonnet"]}], "councilConclusion": "one sentence on which position the council favors and why" }
  ]
}
If there are no meaningful disagreements, return an empty array for "disagreements".`;
}

export interface SynthesisOutcome {
  finalAnswer: string;
  whyChosen: string[];
  disagreements: DisagreementItem[];
}

export async function synthesizeAnswer(
  apiKey: string,
  synthesizerModelId: string,
  prompt: string,
  results: ModelRunResult[],
  evaluations: ModelEvaluation[],
  timeoutMs = 60_000
): Promise<SynthesisOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { content } = await chatCompletion(
      apiKey,
      synthesizerModelId,
      [
        { role: "system", content: "You synthesize multiple AI answers into one superior answer. Output strict JSON only." },
        { role: "user", content: buildSynthesisPrompt(prompt, results, evaluations) },
      ],
      { temperature: 0.3, maxTokens: 3000, signal: controller.signal }
    );
    const parsed = extractJson(content, "Synthesis response") as {
      finalAnswer?: string;
      whyChosen?: string[];
      disagreements?: DisagreementItem[];
    };
    return {
      finalAnswer: parsed.finalAnswer ?? "The council could not produce a synthesized answer.",
      whyChosen: parsed.whyChosen ?? [],
      disagreements: parsed.disagreements ?? [],
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Confidence reflects agreement among the council + judges, NOT factual truth. */
export function computeConfidence(evaluations: ModelEvaluation[], disagreementCount: number): {
  confidence: number;
  reason: string;
} {
  if (evaluations.length === 0) {
    return { confidence: 0, reason: "No evaluations were available." };
  }
  const totals = evaluations.map((e) => e.total);
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length;
  const stdev = Math.sqrt(variance);

  const topThird = [...totals].sort((a, b) => b - a).slice(0, Math.max(1, Math.ceil(totals.length / 3)));
  const topAvg = topThird.reduce((a, b) => a + b, 0) / topThird.length;

  let confidence = topAvg - stdev * 1.5 - disagreementCount * 3;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const agreeingShare = totals.filter((t) => t >= mean - 5).length;
  const reason = `${agreeingShare}/${totals.length} models scored within a close range of each other${
    disagreementCount > 0 ? `, with ${disagreementCount} notable disagreement${disagreementCount > 1 ? "s" : ""} detected` : ", with no major disagreements detected"
  }.`;

  return { confidence, reason };
}

export function buildSummary(
  synthesis: SynthesisOutcome,
  evaluations: ModelEvaluation[]
): CouncilRunSummary {
  const sorted = [...evaluations].sort((a, b) => b.total - a.total);
  const topModelIds = sorted.slice(0, 3).map((e) => e.modelId);
  const { confidence, reason } = computeConfidence(evaluations, synthesis.disagreements.length);

  return {
    finalAnswer: synthesis.finalAnswer,
    whyChosen: synthesis.whyChosen,
    topModelIds,
    confidence,
    confidenceReason: reason,
    disagreements: synthesis.disagreements,
  };
}
