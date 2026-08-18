import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/openrouter";
import { selectJudges } from "@/lib/council/evaluation";

// Rough per-call token assumptions used purely for pre-flight cost estimates.
const ASSUMED_PROMPT_TOKENS = 400;
const ASSUMED_SYNTHESIS_PROMPT_TOKENS = 1500;
const ASSUMED_SYNTHESIS_COMPLETION_TOKENS = 800;
const JUDGE_PROMPT_MULTIPLIER = 3; // judge prompt includes all responses

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const selectedModelIds: string[] = body.selectedModelIds ?? [];
    const maxTokens: number = body.maxTokens ?? 1024;
    const judgeCount: number = body.judgeCount ?? 1;

    const catalog = await listModels();
    const catalogMap = new Map(catalog.map((m) => [m.id, m]));
    const judgeModelIds = selectJudges(catalog, selectedModelIds, judgeCount);

    const perModel = selectedModelIds.map((id) => {
      const model = catalogMap.get(id);
      const cost = model
        ? ASSUMED_PROMPT_TOKENS * model.pricing.prompt + maxTokens * model.pricing.completion
        : 0;
      return { modelId: id, estimatedCost: cost };
    });

    const perJudge = judgeModelIds.map((id) => {
      const model = catalogMap.get(id);
      const cost = model
        ? ASSUMED_PROMPT_TOKENS * JUDGE_PROMPT_MULTIPLIER * selectedModelIds.length * model.pricing.prompt +
          600 * model.pricing.completion
        : 0;
      return { modelId: id, estimatedCost: cost };
    });

    const synthModel = catalogMap.get(judgeModelIds[0]);
    const synthesisCost = synthModel
      ? ASSUMED_SYNTHESIS_PROMPT_TOKENS * synthModel.pricing.prompt +
        ASSUMED_SYNTHESIS_COMPLETION_TOKENS * synthModel.pricing.completion
      : 0;

    const totalEstimatedCost =
      perModel.reduce((s, m) => s + m.estimatedCost, 0) +
      perJudge.reduce((s, j) => s + j.estimatedCost, 0) +
      synthesisCost;

    return NextResponse.json({
      perModel,
      judgeModelIds,
      perJudge,
      synthesisCost,
      totalEstimatedCost,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to estimate cost" },
      { status: 500 }
    );
  }
}
