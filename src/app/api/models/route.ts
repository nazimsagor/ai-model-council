import { NextRequest, NextResponse } from "next/server";
import { getTrendingModelIds, listModels } from "@/lib/openrouter";

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  try {
    const [models, trendingIds] = await Promise.all([listModels(forceRefresh), getTrendingModelIds()]);
    const providers = Array.from(new Set(models.map((m) => m.provider))).sort();
    // Weekly usage order (most-used first) — lets client-side combos like
    // "Quality leaders" follow what's actually trending. Empty if unavailable.
    return NextResponse.json({ models, providers, trendingIds: trendingIds.slice(0, 150) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load models" },
      { status: 500 }
    );
  }
}
