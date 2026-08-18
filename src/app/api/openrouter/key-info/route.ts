import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-openrouter-key")?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "No API key provided" }, { status: 400 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const status = res.status === 401 ? 401 : 502;
    const message = res.status === 401 ? "This key was rejected by OpenRouter — check it's correct." : "Could not reach OpenRouter to verify the key.";
    return NextResponse.json({ error: message }, { status });
  }

  const json = (await res.json()) as {
    data: {
      label: string;
      limit: number | null;
      limit_remaining: number | null;
      usage: number;
      is_free_tier: boolean;
    };
  };

  return NextResponse.json({
    label: json.data.label,
    limit: json.data.limit,
    limitRemaining: json.data.limit_remaining,
    usage: json.data.usage,
    isFreeTier: json.data.is_free_tier,
  });
}
