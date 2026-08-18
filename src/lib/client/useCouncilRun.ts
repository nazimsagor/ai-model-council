"use client";

import { useCallback, useReducer, useRef } from "react";
import type { SSEEvent } from "../types";
import { applyEvent, initialRunState, type RunViewState } from "./runState";

type Action =
  | { type: "reset"; prompt: string; modelIds: string[] }
  | { type: "clear" }
  | { type: "event"; event: SSEEvent };

function reducer(state: RunViewState | null, action: Action): RunViewState | null {
  if (action.type === "reset") return initialRunState(action.prompt, action.modelIds);
  if (action.type === "clear") return null;
  if (!state) return state;
  return applyEvent(state, action.event);
}

export interface RunCouncilRequest {
  prompt: string;
  customSystemPrompt?: string;
  promptMode?: string;
  workflow?: string;
  mode?: string;
  selectedModelIds: string[];
  autoSelect?: boolean;
  freeModelsOnly?: boolean;
  judgeCount?: number;
  blindJudging?: boolean;
  temperature?: number;
  maxTokens?: number;
  maxBudget?: number;
  webSearch?: boolean;
}

export function useCouncilRun() {
  const [state, dispatch] = useReducer(reducer, null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (req: RunCouncilRequest, apiKey: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "reset", prompt: req.prompt, modelIds: req.selectedModelIds });

    const res = await fetch("/api/council/run", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-openrouter-key": apiKey },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      dispatch({ type: "event", event: { type: "error", message: body.error ?? "Council run failed to start." } });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        try {
          const event = JSON.parse(raw) as SSEEvent;
          dispatch({ type: "event", event });
        } catch {
          // ignore malformed chunk
        }
      }
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "clear" });
  }, []);

  return { state, run, cancel, clear };
}
