"use client";

import { useCallback, useReducer, useRef } from "react";
import type { SSEEvent } from "../types";
import { applyEvent, initialRunState, type RunViewState } from "./runState";

type Action =
  | { type: "reset"; prompt: string; modelIds: string[] }
  | { type: "clear" }
  | { type: "restore"; state: RunViewState }
  | { type: "event"; event: SSEEvent };

function reducer(state: RunViewState | null, action: Action): RunViewState | null {
  if (action.type === "reset") return initialRunState(action.prompt, action.modelIds);
  if (action.type === "clear") return null;
  if (action.type === "restore") return action.state;
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
  judgeModelId?: string;
  blindJudging?: boolean;
  temperature?: number;
  maxTokens?: number;
  maxBudget?: number;
  webSearch?: boolean;
  // Chat follow-ups: earlier turns of the conversation, oldest first, and
  // the id of its first run so the follow-up is saved under that chat.
  history?: { role: "user" | "assistant"; content: string }[];
  parentRunId?: string;
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

    // By the time this response exists, the server has already created the
    // run row (or rejected before doing so, in which case this is a
    // harmless no-op) — a more reliable signal than firing on click, which
    // races ahead of the server actually inserting anything.
    window.dispatchEvent(new Event("council:run-started"));

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

  // Puts a finished run back on screen (e.g. reopening a saved chat).
  const restore = useCallback((state: RunViewState) => {
    abortRef.current?.abort();
    dispatch({ type: "restore", state });
  }, []);

  return { state, run, cancel, clear, restore };
}
