import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/openrouter";
import { autoSelectModels } from "@/lib/council/autoSelect";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body.prompt ?? "";
    const count: number = body.count ?? 8;
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    let catalog = await listModels();
    if (body.freeModelsOnly) {
      catalog = catalog.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0);
    }
    const result = autoSelectModels(prompt, catalog, count);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto-select failed" },
      { status: 500 }
    );
  }
}
