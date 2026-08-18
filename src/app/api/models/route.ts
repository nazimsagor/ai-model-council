import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/openrouter";

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  try {
    const models = await listModels(forceRefresh);
    const providers = Array.from(new Set(models.map((m) => m.provider))).sort();
    return NextResponse.json({ models, providers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load models" },
      { status: 500 }
    );
  }
}
