import { NextRequest, NextResponse } from "next/server";
import { getTrendingModelIds, listModels } from "@/lib/openrouter";
import { buildCouncilRecommendation, COUNCIL_MODE_COUNTS } from "@/lib/council/autoSelect";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const modeParam = req.nextUrl.searchParams.get("mode") ?? "seven";
  const freeOnly = req.nextUrl.searchParams.get("freeModelsOnly") === "1";
  const count = COUNCIL_MODE_COUNTS[modeParam] ?? COUNCIL_MODE_COUNTS.seven;

  let catalog = await listModels();
  if (freeOnly) {
    catalog = catalog.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0);
  }

  const trendingIds = await getTrendingModelIds();
  const recommendation = buildCouncilRecommendation(catalog, trendingIds, count);

  return NextResponse.json(recommendation);
}
