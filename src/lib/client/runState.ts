import type {
  CouncilRunSummary,
  ModelEvaluation,
  ModelRunStatus,
  SSEEvent,
} from "../types";

export interface ModelState {
  modelId: string;
  status: ModelRunStatus;
  content: string;
  error?: string;
  latencyMs?: number;
  cost?: number;
  promptTokens?: number;
  completionTokens?: number;
}

export type RunPhase = "idle" | "running" | "evaluating" | "synthesizing" | "done" | "error";

export interface RunViewState {
  runId?: string;
  prompt: string;
  phase: RunPhase;
  modelStates: Record<string, ModelState>;
  order: string[];
  evaluations: ModelEvaluation[];
  summary?: CouncilRunSummary;
  totalCost: number;
  totalTimeMs: number;
  notices: string[];
  startedAt?: number;
}

export function initialRunState(prompt: string, modelIds: string[]): RunViewState {
  const modelStates: Record<string, ModelState> = {};
  for (const id of modelIds) {
    modelStates[id] = { modelId: id, status: "pending", content: "" };
  }
  return {
    prompt,
    phase: "running",
    modelStates,
    order: modelIds,
    evaluations: [],
    totalCost: 0,
    totalTimeMs: 0,
    notices: [],
    startedAt: Date.now(),
  };
}

// Auto-route doesn't know which model was picked until the server responds,
// so the initial state may have an empty order/modelStates — add entries on the fly.
function ensureModel(state: RunViewState, modelId: string): RunViewState {
  if (state.modelStates[modelId]) return state;
  return {
    ...state,
    order: [...state.order, modelId],
    modelStates: { ...state.modelStates, [modelId]: { modelId, status: "pending", content: "" } },
  };
}

export function applyEvent(state: RunViewState, event: SSEEvent): RunViewState {
  switch (event.type) {
    case "status": {
      const withModel = ensureModel(state, event.modelId);
      const existing = withModel.modelStates[event.modelId];
      return {
        ...withModel,
        modelStates: {
          ...withModel.modelStates,
          [event.modelId]: { ...existing, status: event.status },
        },
      };
    }
    case "delta": {
      const withModel = ensureModel(state, event.modelId);
      const existing = withModel.modelStates[event.modelId];
      return {
        ...withModel,
        modelStates: {
          ...withModel.modelStates,
          [event.modelId]: { ...existing, content: existing.content + event.text },
        },
      };
    }
    case "model_complete": {
      const withModel = ensureModel(state, event.result.modelId);
      const existing = withModel.modelStates[event.result.modelId];
      return {
        ...withModel,
        modelStates: {
          ...withModel.modelStates,
          [event.result.modelId]: {
            modelId: event.result.modelId,
            status: event.result.status,
            content: event.result.content || existing?.content || "",
            error: event.result.error,
            latencyMs: event.result.latencyMs,
            cost: event.result.cost,
            promptTokens: event.result.promptTokens,
            completionTokens: event.result.completionTokens,
          },
        },
      };
    }
    case "evaluating":
      return { ...state, phase: "evaluating" };
    case "evaluation_complete":
      return { ...state, evaluations: event.evaluations };
    case "synthesizing":
      return { ...state, phase: "synthesizing" };
    case "done":
      return {
        ...state,
        phase: "done",
        runId: event.runId,
        summary: event.summary,
        totalCost: event.totalCost,
        totalTimeMs: event.totalTimeMs,
      };
    case "error": {
      // A top-level error (e.g. the request was rejected before any model
      // even started streaming) would otherwise leave every model stuck on
      // "Queued"/"Waiting for response" forever — flip anything not yet
      // finished over to failed so the UI reflects that the run stopped.
      const modelStates = { ...state.modelStates };
      for (const id of state.order) {
        const s = modelStates[id];
        if (!s || s.status === "pending" || s.status === "streaming") {
          modelStates[id] = { ...s, modelId: id, status: "failed", content: s?.content ?? "", error: event.message };
        }
      }
      return { ...state, phase: "error", modelStates, notices: [...state.notices, event.message] };
    }
    default:
      return state;
  }
}
