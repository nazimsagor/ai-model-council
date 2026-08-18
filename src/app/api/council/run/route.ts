import { NextRequest } from "next/server";
import { getTrendingModelIds, listModels } from "@/lib/openrouter";
import { selectJudges } from "@/lib/council/evaluation";
import { autoSelectModels, COUNCIL_MODE_COUNTS } from "@/lib/council/autoSelect";
import { buildSystemPrompt } from "@/lib/council/prompts";
import { runCouncil } from "@/lib/council/orchestrator";
import { createRun } from "@/lib/repository";
import { getVisitorId } from "@/lib/session";
import type { CouncilMode, PromptMode, SSEEvent, Workflow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RunRequestBody {
  prompt: string;
  customSystemPrompt?: string;
  promptMode?: PromptMode;
  workflow?: Workflow;
  mode?: CouncilMode;
  selectedModelIds?: string[];
  autoSelect?: boolean;
  freeModelsOnly?: boolean;
  judgeCount?: number;
  judgeModelId?: string;
  blindJudging?: boolean;
  temperature?: number;
  maxTokens?: number;
  maxBudget?: number;
  webSearch?: boolean;
}

function sseFormat(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  const visitorId = await getVisitorId();

  const apiKey = req.headers.get("x-openrouter-key")?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Add your OpenRouter API key first (see the menu in the top right)." }),
      { status: 401 }
    );
  }

  const body = (await req.json()) as RunRequestBody;

  if (!body.prompt || !body.prompt.trim()) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
  }

  const workflow: Workflow = body.workflow ?? "council";
  const evaluate = workflow === "council";
  const isSingleModelWorkflow = workflow === "chat" || workflow === "auto";

  let catalog = await listModels();
  if (body.freeModelsOnly) {
    catalog = catalog.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0);
  }

  const mode: CouncilMode = body.mode ?? "balanced";
  const promptMode: PromptMode = body.promptMode ?? "standard";
  const desiredCount = isSingleModelWorkflow ? 1 : (COUNCIL_MODE_COUNTS[mode] ?? 8);

  let selectedModelIds = body.selectedModelIds ?? [];
  // Auto-route always lets the system choose; other workflows auto-select only as a fallback.
  if (workflow === "auto" || body.autoSelect || selectedModelIds.length === 0) {
    const auto = autoSelectModels(body.prompt, catalog, desiredCount);
    selectedModelIds = auto.modelIds;
  }
  selectedModelIds = selectedModelIds.filter((id) => catalog.some((m) => m.id === id));
  if (isSingleModelWorkflow) selectedModelIds = selectedModelIds.slice(0, 1);

  if (selectedModelIds.length === 0) {
    return new Response(JSON.stringify({ error: "No valid models selected" }), { status: 400 });
  }

  // A user-chosen judge (the "crown" pick in the UI) takes priority over
  // auto-selection, as long as it's a real catalog model not already
  // debating (a model should never judge its own answer).
  const explicitJudgeId =
    body.judgeModelId && catalog.some((m) => m.id === body.judgeModelId) && !selectedModelIds.includes(body.judgeModelId)
      ? body.judgeModelId
      : undefined;
  const judgeCount = evaluate ? (explicitJudgeId ? 1 : (body.judgeCount ?? (mode === "deep" || mode === "maximum" ? 3 : 1))) : 0;
  const judgeModelIds = evaluate
    ? explicitJudgeId
      ? [explicitJudgeId]
      : selectJudges(catalog, selectedModelIds, judgeCount, await getTrendingModelIds())
    : [];
  const temperature = body.temperature ?? 0.7;
  const maxTokens = body.maxTokens ?? 1024;
  const systemPrompt = buildSystemPrompt(promptMode, body.customSystemPrompt);

  // Server-side budget guard (soft pre-flight check).
  if (typeof body.maxBudget === "number") {
    const catalogMap = new Map(catalog.map((m) => [m.id, m]));
    const estimated = selectedModelIds.reduce((sum, id) => {
      const m = catalogMap.get(id);
      return sum + (m ? 400 * m.pricing.prompt + maxTokens * m.pricing.completion : 0);
    }, 0);
    if (estimated > body.maxBudget * 1.5) {
      return new Response(
        JSON.stringify({ error: "budget_exceeded", estimated, budget: body.maxBudget }),
        { status: 402 }
      );
    }
  }

  const runId = await createRun({
    visitorId,
    prompt: body.prompt,
    systemPrompt,
    workflow,
    mode,
    promptMode,
    params: { temperature, maxTokens },
    selectedModelIds,
    judgeModelIds,
    blindJudging: body.blindJudging ?? true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(sseFormat(event)));
        } catch {
          // client disconnected
        }
      };

      try {
        await runCouncil(
          {
            runId,
            apiKey,
            prompt: body.prompt,
            systemPrompt,
            temperature,
            maxTokens,
            selectedModelIds,
            judgeModelIds,
            evaluate,
            webSearch: body.webSearch,
          },
          catalog,
          emit
        );
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Run-Id": runId,
    },
  });
}
