"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useModels } from "@/lib/client/useModels";
import { useCouncilRun } from "@/lib/client/useCouncilRun";
import { useAppSettings } from "@/lib/client/appSettings";
import { ProviderIcon } from "@/components/ProviderIcon";
import { ModelPickerModal } from "@/components/ModelPickerModal";
import { StatusBoard } from "@/components/StatusBoard";
import { JudgeStatus } from "@/components/JudgeStatus";
import { ResponseCard } from "@/components/ResponseCard";
import { SingleResponseView } from "@/components/SingleResponseView";
import { VerdictPanel } from "@/components/VerdictPanel";
import { DisagreementList } from "@/components/DisagreementList";
import { CostSpeedSummary } from "@/components/CostSpeedSummary";
import { Icon, ICON_PATHS } from "@/components/icons";
import { COMBOS, resolveCombo } from "@/lib/council/combos";
import { useCurrentUser } from "@/lib/client/useCurrentUser";
import type { PromptMode, Workflow } from "@/lib/types";

const WORKFLOWS: { id: Workflow; label: string; desc: string; icon: keyof typeof ICON_PATHS }[] = [
  { id: "chat", label: "Chat", desc: "One model, one focused answer", icon: "chat" },
  { id: "compare", label: "Compare", desc: "Independent answers, side by side", icon: "compare" },
  { id: "council", label: "Council", desc: "Independent perspectives, one verdict", icon: "council" },
];

const MODES: { id: string; label: string; count: number; hint: string }[] = [
  { id: "four", label: "4-Member", count: 4, hint: "4 debaters + judge" },
  { id: "six", label: "6-Member", count: 6, hint: "6 debaters + judge" },
  { id: "eight", label: "8-Member", count: 8, hint: "8 debaters + judge" },
];

const PROMPT_MODES: { id: PromptMode; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "expert", label: "Expert" },
  { id: "research", label: "Research" },
  { id: "coding", label: "Coding" },
  { id: "creative", label: "Creative" },
  { id: "decision", label: "Decision" },
];

const BUDGETS = [0.5, 1, 5, 10];

const COMBO_MODEL_COUNT = 3;

// Real paths (/chat, /compare, /council) so each workflow has its own
// shareable URL, mirroring getmulti.ai's layout. "/" still defaults to chat
// for the plain-Home nav entry, and the legacy ?workflow= query param is
// still honored as a fallback so old links keep working.
const PATH_WORKFLOW: Record<string, Workflow> = { "/chat": "chat", "/compare": "compare", "/council": "council" };

const WORKFLOW_COPY: Record<Workflow, { plain: string; accent: string; sub: string }> = {
  chat: {
    plain: "One model.",
    accent: "One clear answer.",
    sub: "Pick a model or let auto-select choose. You can switch anytime.",
  },
  compare: {
    plain: "Every angle,",
    accent: "side by side.",
    sub: "The same prompt, independent answers from every model you pick — no synthesis, just the raw comparison.",
  },
  council: {
    plain: "Every model debates.",
    accent: "One verdict wins.",
    sub: "Independent perspectives, blind judging across ten dimensions, and one synthesized final answer.",
  },
};

export function CouncilDashboard() {
  const { models, error: modelsError } = useModels();
  const { state, run, clear } = useCouncilRun();
  const { freeModelsOnly, apiKey, hasApiKey, openKeyModal, defaultModelId, setDefaultModelId } = useAppSettings();
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const workflow: Workflow = PATH_WORKFLOW[pathname] ?? (searchParams.get("workflow") as Workflow | null) ?? "chat";

  function setWorkflow(w: Workflow) {
    router.replace(`/${w}`, { scroll: false });
  }

  // A retried/duplicate OAuth callback (e.g. double-clicking "Continue with
  // Google", or a stale tab replaying an old redirect) can leave Supabase's
  // raw ?error=...&error_code=flow_state_already_used in the URL even when
  // the session from the FIRST attempt already succeeded — the code is
  // single-use, so only the retry fails. Harmless, but leaving Supabase's
  // internal error string sitting in the address bar looks broken, so wipe
  // it once mounted rather than showing it.
  useEffect(() => {
    if (!searchParams.get("error")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("error");
      params.delete("error_code");
      params.delete("error_description");
      const query = params.toString();
      router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname, { scroll: false });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMultiModel = workflow === "compare" || workflow === "council";

  const [prompt, setPrompt] = useState("");
  const [web, setWeb] = useState(false);
  const [mode, setMode] = useState("six");
  const [promptMode, setPromptMode] = useState<PromptMode>("standard");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoReason, setAutoReason] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [judgeModelId, setJudgeModelId] = useState<string | null>(null);
  const [recommendationSource, setRecommendationSource] = useState<"trending" | "heuristic" | null>(null);
  const [combo, setCombo] = useState<string>("quality-leaders");
  const [comboMenuOpen, setComboMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [judgePickerOpen, setJudgePickerOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [judgeCount, setJudgeCount] = useState(1);
  const [blindJudging, setBlindJudging] = useState(true);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");

  const [budget, setBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState("");
  const [estimate, setEstimate] = useState<{ totalEstimatedCost: number } | null>(null);
  const [confirmOverBudget, setConfirmOverBudget] = useState(false);

  const runningPhases = new Set(["running", "evaluating", "synthesizing"]);
  const isRunning = state ? runningPhases.has(state.phase) : false;

  const modelPicked = useRef(false);

  // Reset the whole composer when the sidebar's "New Council" button fires.
  useEffect(() => {
    function reset() {
      clear();
      setPrompt("");
      setSelectedIds(new Set());
      setAutoReason(null);
      setJudgeModelId(null);
      setRecommendationSource(null);
      modelPicked.current = false;
    }
    window.addEventListener("council:new", reset);
    return () => window.removeEventListener("council:new", reset);
  }, [clear]);

  // Each workflow tab has its own selection semantics (single model for
  // Chat, a lineup for Compare/Council) — start fresh when switching so a
  // leftover Chat pick doesn't block Council's own default lineup below.
  const prevWorkflowRef = useRef(workflow);
  useEffect(() => {
    if (prevWorkflowRef.current === workflow) return;
    prevWorkflowRef.current = workflow;
    modelPicked.current = false;
    setSelectedIds(new Set());
    setAutoReason(null);
    setJudgeModelId(null);
    setRecommendationSource(null);
    setCombo("quality-leaders");
  }, [workflow]);

  // "Use free models" is a hard constraint — flipping it after Council/
  // Compare already auto-populated a lineup must re-roll that lineup, not
  // silently leave the old (possibly now-forbidden) picks in place.
  const prevFreeModelsOnlyRef = useRef(freeModelsOnly);
  useEffect(() => {
    if (prevFreeModelsOnlyRef.current === freeModelsOnly) return;
    prevFreeModelsOnlyRef.current = freeModelsOnly;
    modelPicked.current = false;
    setSelectedIds(new Set());
    setJudgeModelId(null);
    setRecommendationSource(null);
  }, [freeModelsOnly]);

  const availableModels = useMemo(
    () => (freeModelsOnly ? models.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0) : models),
    [models, freeModelsOnly]
  );

  // A saved default chat model doesn't need auto-select or a typed prompt —
  // it's ready the moment Chat is opened, matching "keep your saved default".
  useEffect(() => {
    if (workflow !== "chat") return;
    if (modelPicked.current || selectedIds.size > 0) return;
    if (!defaultModelId) return;
    if (!availableModels.some((m) => m.id === defaultModelId)) return;
    const timer = setTimeout(() => {
      if (modelPicked.current || selectedIds.size > 0) return;
      modelPicked.current = true;
      setSelectedIds(new Set([defaultModelId]));
    }, 0);
    return () => clearTimeout(timer);
  }, [workflow, defaultModelId, availableModels, selectedIds.size]);

  // Council opens with a real, live-data-backed lineup already chosen — 5
  // models actually trending on OpenRouter this week (one per provider) plus
  // a separate judge — instead of an empty picker waiting for a typed prompt.
  useEffect(() => {
    if (workflow !== "council") return;
    if (modelPicked.current || selectedIds.size > 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (modelPicked.current || selectedIds.size > 0) return;
      fetch(`/api/council/recommended?mode=${mode}&freeModelsOnly=${freeModelsOnly ? "1" : "0"}`)
        .then((r) => r.json())
        .then((json: { modelIds?: string[]; judgeModelId?: string | null; source?: "trending" | "heuristic" }) => {
          if (cancelled || modelPicked.current || selectedIds.size > 0) return;
          if (!json.modelIds || json.modelIds.length === 0) return;
          modelPicked.current = true;
          setSelectedIds(new Set(json.modelIds));
          setJudgeModelId(json.judgeModelId ?? null);
          setRecommendationSource(json.source ?? null);
        })
        .catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workflow, mode, freeModelsOnly, selectedIds.size]);

  // Compare opens with a named combo already applied (default: Quality
  // leaders) — a curated, data-driven lineup instead of an empty picker.
  // Every combo is a fixed size, independent of the Fast/Balanced/Deep/
  // Maximum council-size mode (that mode only applies to Council). Re-
  // resolves whenever the combo changes, but never once the user has
  // manually picked models via "Manually pick".
  useEffect(() => {
    if (workflow !== "compare" || modelPicked.current) return;
    if (availableModels.length === 0) return;
    const timer = setTimeout(() => {
      if (workflow !== "compare" || modelPicked.current) return;
      const ids = resolveCombo(combo, availableModels, COMBO_MODEL_COUNT);
      setSelectedIds(new Set(ids));
    }, 0);
    return () => clearTimeout(timer);
  }, [workflow, combo, availableModels]);

  function applyCombo(comboId: string) {
    modelPicked.current = false;
    setCombo(comboId);
    setComboMenuOpen(false);
  }

  async function autoSelect(count: number) {
    if (!prompt.trim() || availableModels.length === 0) return;
    setAutoBusy(true);
    try {
      const res = await fetch("/api/auto-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count, freeModelsOnly }),
      });
      const json = await res.json();
      if (json.modelIds) {
        setSelectedIds(new Set(json.modelIds));
        setAutoReason(json.reason);
        modelPicked.current = true;
      }
    } finally {
      setAutoBusy(false);
    }
  }

  // Auto-populate a default selection once models are loaded AND a prompt is typed,
  // whichever settles last — if the user hasn't manually picked anything yet.
  useEffect(() => {
    if (modelPicked.current || selectedIds.size > 0) return;
    if (availableModels.length === 0 || !prompt.trim()) return;
    const timer = setTimeout(() => {
      if (modelPicked.current || selectedIds.size > 0) return;
      autoSelect(isMultiModel ? (MODES.find((m) => m.id === mode)?.count ?? 6) : 1);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels.length, workflow, prompt]);

  // Debounced cost estimate.
  useEffect(() => {
    const timer = setTimeout(() => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) {
        setEstimate(null);
        return;
      }
      fetch("/api/council/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedModelIds: ids, maxTokens, judgeCount: workflow === "council" ? judgeCount : 0 }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (typeof json.totalEstimatedCost === "number") setEstimate(json);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedIds, maxTokens, judgeCount, workflow]);

  const effectiveBudget = budget ?? (customBudget ? Number(customBudget) : null);
  const overBudget =
    effectiveBudget != null && estimate != null && estimate.totalEstimatedCost > effectiveBudget;

  function toggleModel(id: string) {
    modelPicked.current = true;
    setSelectedIds((prev) => {
      if (workflow === "chat") return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // A model can't debate and judge itself — clear the judge if it was just added as a panelist.
    if (workflow === "council" && id === judgeModelId) setJudgeModelId(null);
  }

  function handleModeClick(m: (typeof MODES)[number]) {
    setMode(m.id);
    setJudgeCount(1);
    // Re-roll immediately from the live-data recommendation at the new
    // size, the same way switching workflows or "Use free models" does —
    // autoSelect() needs a typed prompt and would silently no-op here,
    // leaving the old lineup showing under the new size label.
    modelPicked.current = false;
    setSelectedIds(new Set());
    setJudgeModelId(null);
    setRecommendationSource(null);
  }

  async function handleRun() {
    if (!prompt.trim() || isRunning) return;
    if (selectedIds.size === 0) return;
    // Browsing is fully open, but running a chat needs an account — the
    // API enforces this too, but redirecting straight to /login here is a
    // much better experience than surfacing a "sign in" error banner.
    if (!userLoading && !user) {
      router.push(`/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
      return;
    }
    if (!hasApiKey) {
      openKeyModal();
      return;
    }
    if (overBudget && !confirmOverBudget) {
      setConfirmOverBudget(true);
      return;
    }
    setConfirmOverBudget(false);
    await run(
      {
        prompt,
        customSystemPrompt: customSystemPrompt || undefined,
        promptMode,
        workflow,
        mode,
        selectedModelIds: Array.from(selectedIds),
        freeModelsOnly,
        judgeCount: workflow === "council" ? judgeCount : 0,
        judgeModelId: workflow === "council" ? (judgeModelId ?? undefined) : undefined,
        blindJudging,
        temperature,
        maxTokens,
        maxBudget: effectiveBudget ?? undefined,
        webSearch: web,
      },
      apiKey
    );
  }

  // Once judged, rank by score (best first) — the final, meaningful order.
  // Before that, rank by who's actually finished so you can start reading
  // real answers immediately instead of watching them sit in whatever order
  // you happened to select them in while slower models keep thinking.
  const sortedForDisplay = useMemo(() => {
    if (!state) return [];
    const evalMap = new Map(state.evaluations.map((e) => [e.modelId, e]));
    const hasEvaluations = state.evaluations.length > 0;
    const statusRank = (id: string) => {
      const status = state.modelStates[id]?.status;
      if (status === "complete") return 0;
      if (status === "failed" || status === "timeout") return 1;
      return 2; // pending / streaming
    };
    return [...state.order].sort((a, b) => {
      if (hasEvaluations) {
        const ea = evalMap.get(a)?.total ?? -1;
        const eb = evalMap.get(b)?.total ?? -1;
        if (ea !== eb) return eb - ea;
      }
      const ra = statusRank(a);
      const rb = statusRank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 0) {
        // Both complete — whoever finished faster goes first.
        return (state.modelStates[a]?.latencyMs ?? Infinity) - (state.modelStates[b]?.latencyMs ?? Infinity);
      }
      return 0;
    });
  }, [state]);

  const activeWorkflowMeta = WORKFLOWS.find((w) => w.id === workflow)!;
  const copy = WORKFLOW_COPY[workflow];

  const selectedModel = useMemo(() => {
    const id = Array.from(selectedIds)[0];
    return id ? (models.find((m) => m.id === id) ?? null) : null;
  }, [selectedIds, models]);
  const selectedModelName = selectedModel?.name ?? (selectedIds.size > 0 ? Array.from(selectedIds)[0] : null);

  function openPicker() {
    setPickerOpen(true);
  }

  const pillLabel = (() => {
    if (workflow === "chat") return selectedModelName ? `Chat · ${selectedModelName}` : "Chat · pick a model below";
    if (workflow === "compare") return `Compare · ${selectedIds.size || "—"} model${selectedIds.size === 1 ? "" : "s"}`;
    return `Council · ${selectedIds.size || "—"} model${selectedIds.size === 1 ? "" : "s"} + ${judgeCount} judge${judgeCount === 1 ? "" : "s"}`;
  })();

  return (
    <div className={`mx-auto px-4 py-10 sm:px-6 ${state ? "max-w-[1400px]" : "max-w-[720px]"}`}>
      {!state && (
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {pillLabel}
          </span>
          <h1 className="mt-4 font-heading text-[34px] leading-[1.15] tracking-tight sm:text-[40px]">
            {copy.plain} <span className="text-accent-text italic">{copy.accent}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">{copy.sub}</p>
        </div>
      )}

      {!state && (
        <div className="mb-4 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-border bg-surface p-1">
            {WORKFLOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWorkflow(w.id)}
                title={w.desc}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  workflow === w.id ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon path={ICON_PATHS[w.icon]} className="h-3.5 w-3.5" />
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!state && (
        <div className="mb-3 rounded-2xl border border-border bg-surface p-2 shadow-sm transition-colors focus-within:border-accent">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleRun();
              }
            }}
            placeholder={
              workflow === "chat"
                ? `Message ${selectedModelName ?? "a model"}…`
                : "What do you want the council to answer?"
            }
            rows={3}
            className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[14px] outline-none"
          />

          {workflow === "council" && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-1 pt-2 pb-1">
              {Array.from(selectedIds).map((id) => {
                const m = models.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleModel(id)}
                    title={`Remove ${m.name} from the panel`}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] text-foreground transition-colors hover:border-danger hover:text-danger"
                  >
                    <ProviderIcon provider={m.provider} className="h-4 w-4" />
                    <span className="max-w-[110px] truncate">{m.name}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setJudgePickerOpen(true)}
                title="Choose the judge"
                className="flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent-text"
              >
                {judgeModelId ? (
                  <>
                    <ProviderIcon provider={models.find((m) => m.id === judgeModelId)?.provider ?? "?"} className="h-4 w-4" />
                    <span className="max-w-[90px] truncate">{models.find((m) => m.id === judgeModelId)?.name ?? "Judge"}</span>
                  </>
                ) : (
                  <span>Pick a judge</span>
                )}
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-on-accent">
                  Judge
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 rounded-lg border-t border-border px-1 pt-2" title="Enter to send · Shift + Enter for a new line">
            {workflow === "compare" ? (
              <div className="flex min-w-0 items-center gap-1.5">
                {selectedIds.size > 0 && (
                  <div className="flex shrink-0 -space-x-1.5">
                    {Array.from(selectedIds)
                      .slice(0, 4)
                      .map((id) => {
                        const m = models.find((x) => x.id === id);
                        return (
                          <span
                            key={id}
                            className="block h-6 w-6 overflow-hidden rounded-full ring-2 ring-surface"
                          >
                            <ProviderIcon provider={m?.provider ?? "?"} className="h-6 w-6 rounded-none" />
                          </span>
                        );
                      })}
                  </div>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setComboMenuOpen((v) => !v)}
                    className="flex min-w-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-left text-[12px] transition-colors hover:border-border-strong"
                  >
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-2">Combo</span>
                    <span className="truncate font-medium text-foreground">
                      {COMBOS.find((c) => c.id === combo)?.label ?? "Custom selection"}
                    </span>
                    <Icon path={ICON_PATHS.chevronDown} className="h-3 w-3 shrink-0 text-muted-2" />
                  </button>

                  {comboMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close combo menu"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setComboMenuOpen(false)}
                      />
                      <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-border bg-surface-raised py-1.5 shadow-lg">
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                          Recommended combos
                        </div>
                        {COMBOS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => applyCombo(c.id)}
                            className={`flex w-full flex-col px-3 py-1.5 text-left transition-colors ${
                              combo === c.id
                                ? "bg-accent-soft text-accent-text"
                                : "text-foreground hover:bg-background"
                            }`}
                          >
                            <span className="text-[12px] font-medium">{c.label}</span>
                            <span className="text-[11px] text-muted-2">{c.description}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openPicker}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Manually pick
                </button>
              </div>
            ) : workflow === "council" ? (
              <div className="flex min-w-0 items-center gap-1.5">
                {selectedIds.size > 0 && (
                  <div className="flex shrink-0 -space-x-1.5">
                    {Array.from(selectedIds)
                      .slice(0, 4)
                      .map((id) => {
                        const m = models.find((x) => x.id === id);
                        return (
                          <span key={id} className="block h-6 w-6 overflow-hidden rounded-full ring-2 ring-surface">
                            <ProviderIcon provider={m?.provider ?? "?"} className="h-6 w-6 rounded-none" />
                          </span>
                        );
                      })}
                  </div>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSizeMenuOpen((v) => !v)}
                    className="flex min-w-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-left text-[12px] transition-colors hover:border-border-strong"
                  >
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-2">Size</span>
                    <span className="truncate font-medium text-foreground">
                      {MODES.find((m) => m.id === mode)?.label ?? "Custom"}
                    </span>
                    <Icon path={ICON_PATHS.chevronDown} className="h-3 w-3 shrink-0 text-muted-2" />
                  </button>

                  {sizeMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close size menu"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setSizeMenuOpen(false)}
                      />
                      <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-border bg-surface-raised py-1.5 shadow-lg">
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                          Council size
                        </div>
                        {MODES.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              handleModeClick(m);
                              setSizeMenuOpen(false);
                            }}
                            className={`flex w-full flex-col px-3 py-1.5 text-left transition-colors ${
                              mode === m.id ? "bg-accent-soft text-accent-text" : "text-foreground hover:bg-background"
                            }`}
                          >
                            <span className="text-[12px] font-medium">{m.label}</span>
                            <span className="text-[11px] text-muted-2">{m.hint}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openPicker}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={openPicker}
                className="flex min-w-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-left text-[12px] transition-colors hover:border-border-strong"
              >
                {selectedModel ? (
                  <ProviderIcon provider={selectedModel.provider} className="h-4 w-4" />
                ) : (
                  <Icon path={ICON_PATHS.sparkle} className="h-3.5 w-3.5 shrink-0 text-accent" />
                )}
                <span className="truncate font-medium text-foreground">
                  {selectedModelName ?? (autoBusy ? "Auto-selecting…" : "No model selected yet")}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-accent-text">Change</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setWeb((v) => !v)}
              title="Ground answers with live web search results (adds a small per-search cost)"
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                web ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:text-foreground"
              }`}
            >
              <Icon path={ICON_PATHS.globe} className="h-3.5 w-3.5" />
              Web
              <span
                role="switch"
                aria-checked={web}
                style={{ backgroundColor: web ? "var(--accent)" : "var(--border-strong)" }}
                className="relative ml-0.5 h-4 w-7 shrink-0 overflow-hidden rounded-full transition-colors"
              >
                <span
                  style={{ left: web ? 14 : 2 }}
                  className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-[left]"
                />
              </span>
            </button>

            <button
              onClick={hasApiKey ? handleRun : openKeyModal}
              disabled={hasApiKey && (!prompt.trim() || isRunning || selectedIds.size === 0)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              {hasApiKey ? (
                <>
                  {workflow === "compare" ? "Compare" : workflow === "council" ? "Run Council" : "Ask"}
                  <Icon path={ICON_PATHS.arrowUp} className="h-3.5 w-3.5" />
                </>
              ) : (
                "Add API key"
              )}
            </button>
          </div>
        </div>
      )}

      {!state && (
        <div className="mb-4 rounded-xl border border-border">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span>
              <span className="block text-[13px] font-medium">Configure {activeWorkflowMeta.label}</span>
              <span className="block text-[11px] text-muted-2">Models, budget, and expert controls</span>
            </span>
            <span className="text-[11px] text-muted-2">{showAdvanced ? "Hide" : "Optional"}</span>
          </button>

          {showAdvanced && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              <div className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                    {workflow === "chat" ? "Chat Model" : `${activeWorkflowMeta.label} Models`}
                  </div>
                  <div className="mb-0.5 text-[14px] font-medium text-foreground">
                    {workflow === "chat"
                      ? selectedModelName
                        ? "One model is ready"
                        : "No model selected yet"
                      : `${selectedIds.size || 0} model${selectedIds.size === 1 ? "" : "s"} selected`}
                  </div>
                  <p className="mb-3 text-[11px] text-muted-2">
                    {workflow === "chat"
                      ? "Change it now or let auto-select choose."
                      : "Adjust the council size or pick models manually below."}
                  </p>

                  {workflow === "chat" ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ProviderIcon provider={selectedModel?.provider ?? "?"} className="h-7 w-7" />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-foreground">
                            {selectedModelName ?? "No model selected"}
                          </div>
                          <div className="truncate text-[11px] capitalize text-muted-2">
                            {selectedModel?.id === defaultModelId
                              ? "Your default model"
                              : (selectedModel?.provider ?? (autoBusy ? "Auto-selecting…" : "—"))}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button onClick={openPicker} className="text-[12px] font-medium text-accent-text hover:underline">
                          Change
                        </button>
                        {selectedModelName && (
                          <span className="flex items-center gap-1 text-[11px] text-success">
                            <Icon path={ICON_PATHS.check} className="h-3 w-3" />
                            {selectedModel?.id === defaultModelId ? "Default ready" : "Ready"}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-foreground">
                          {selectedIds.size || 0} model{selectedIds.size === 1 ? "" : "s"}
                          {workflow === "council" ? ` · ${judgeCount} judge${judgeCount === 1 ? "" : "s"}` : ""}
                        </div>
                        <div className="text-[11px] text-muted-2">
                          {MODES.find((m) => m.id === mode)?.label ?? "Custom"} council
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button onClick={openPicker} className="text-[12px] font-medium text-accent-text hover:underline">
                          Change
                        </button>
                        {selectedIds.size > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-success">
                            <Icon path={ICON_PATHS.check} className="h-3 w-3" /> Ready
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {workflow === "council" && judgeModelId && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                      <ProviderIcon
                        provider={models.find((m) => m.id === judgeModelId)?.provider ?? "?"}
                        className="h-6 w-6"
                      />
                      <div className="min-w-0 text-[11px]">
                        <span className="font-medium text-foreground">
                          Judge: {models.find((m) => m.id === judgeModelId)?.name ?? judgeModelId}
                        </span>
                        <span className="ml-1.5 text-muted-2">
                          {recommendationSource === "trending"
                            ? "· recommended from live OpenRouter usage"
                            : "· recommended by capability"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              {isMultiModel && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => autoSelect(MODES.find((x) => x.id === mode)?.count ?? 6)}
                    disabled={!prompt.trim() || autoBusy}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground disabled:opacity-40"
                  >
                    <Icon path={ICON_PATHS.sparkle} className="h-3.5 w-3.5" />
                    {autoBusy ? "Analyzing…" : "Auto Select Models"}
                  </button>
                </div>
              )}

              {workflow === "chat" && (
                <button
                  onClick={() => autoSelect(1)}
                  disabled={!prompt.trim() || autoBusy}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground disabled:opacity-40"
                >
                  <Icon path={ICON_PATHS.sparkle} className="h-3.5 w-3.5" />
                  {autoBusy ? "Analyzing…" : "Auto Select Model"}
                </button>
              )}

              {autoReason && (
                <div className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent-text">
                  <span className="font-semibold">AI Recommendation: </span>
                  {autoReason}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {PROMPT_MODES.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPromptMode(pm.id)}
                    className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                      promptMode === pm.id
                        ? "border-accent bg-accent-soft text-accent-text"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
                <label className="flex flex-col gap-1">
                  Temperature
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="rounded border border-border bg-background px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Max tokens
                  <input
                    type="number"
                    min={64}
                    max={8000}
                    step={64}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="rounded border border-border bg-background px-2 py-1"
                  />
                </label>
                {workflow === "council" && (
                  <>
                    <label className="flex flex-col gap-1">
                      Judges
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={judgeCount}
                        onChange={(e) => setJudgeCount(Number(e.target.value))}
                        className="rounded border border-border bg-background px-2 py-1"
                      />
                    </label>
                    <label className="flex items-center gap-2 self-end pb-1">
                      <input
                        type="checkbox"
                        checked={blindJudging}
                        onChange={(e) => setBlindJudging(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      Blind judging
                    </label>
                  </>
                )}
              </div>

              <label className="flex flex-col gap-1 text-[12px]">
                System prompt override
                <textarea
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  rows={2}
                  placeholder="Leave blank to use the selected prompt mode's default instructions."
                  className="resize-none rounded border border-border bg-background px-2 py-1"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">
                    Max Budget
                  </span>
                  {estimate && (
                    <span className={`text-[12px] font-mono ${overBudget ? "text-danger" : "text-muted"}`}>
                      Estimated: ${estimate.totalEstimatedCost.toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {BUDGETS.map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        setBudget(b);
                        setCustomBudget("");
                        setConfirmOverBudget(false);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-[12px] ${
                        budget === b ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted"
                      }`}
                    >
                      ${b}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Custom"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value);
                      setBudget(null);
                      setConfirmOverBudget(false);
                    }}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px]"
                  />
                  <button
                    onClick={() => {
                      setBudget(null);
                      setCustomBudget("");
                    }}
                    className="text-[11px] text-muted-2 underline"
                  >
                    No limit
                  </button>
                </div>
                {overBudget && (
                  <div className="mt-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[12px] text-warning">
                    Estimated cost exceeds your budget. Click “Run” again to run anyway.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {modelsError && !state && (
        <div className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] text-danger">
          Failed to load models: {modelsError}
        </div>
      )}

      {state && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-accent px-4 py-2.5 text-[13px] leading-snug text-on-accent shadow-sm">
              {state.prompt}
            </div>
          </div>

          {workflow === "council" && (
            <JudgeStatus
              judgeModelId={judgeModelId}
              models={models}
              phase={state.phase}
              evaluations={state.evaluations}
              notices={state.notices}
            />
          )}

          <StatusBoard
            order={state.order}
            modelStates={state.modelStates}
            label={workflow === "council" ? "AI Model Council" : activeWorkflowMeta.label}
          />

          {state.notices.map((n, i) => (
            <div key={i} className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[12px] text-warning">
              {n}
            </div>
          ))}

          {state.phase === "done" && state.summary && (
            <>
              <VerdictPanel summary={state.summary} modelCount={state.order.length} />
              <div>
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-2">
                  Where Models Disagree
                </h3>
                <DisagreementList disagreements={state.summary.disagreements} />
              </div>
            </>
          )}

          {state.order.length === 1 ? (
            <SingleResponseView
              modelId={state.order[0]}
              state={state.modelStates[state.order[0]]}
              models={models}
              onSecondOpinion={workflow === "chat" ? () => setWorkflow("compare") : undefined}
              onCouncilReview={workflow === "chat" ? () => setWorkflow("council") : undefined}
              onOrchestrate={workflow === "chat" ? () => autoSelect(1) : undefined}
              onRetry={handleRun}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {sortedForDisplay.map((id, i) => {
                const evalData = state.evaluations.find((e) => e.modelId === id);
                return (
                  <ResponseCard
                    key={id}
                    modelId={id}
                    state={state.modelStates[id]}
                    evaluation={evalData}
                    rank={state.evaluations.length > 0 ? i : undefined}
                  />
                );
              })}
            </div>
          )}

          {state.phase === "done" && (
            <>
              <CostSpeedSummary
                order={state.order}
                modelStates={state.modelStates}
                totalCost={state.totalCost}
                totalTimeMs={state.totalTimeMs}
              />
              {state.runId && (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/history/${state.runId}/export?format=markdown`}
                    className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
                  >
                    Export Markdown
                  </a>
                  <a
                    href={`/api/history/${state.runId}/export?format=json`}
                    className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
                  >
                    Export JSON
                  </a>
                  <Link
                    href={`/history/${state.runId}`}
                    className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
                  >
                    View in History
                  </Link>
                  <button
                    onClick={() => window.dispatchEvent(new Event("council:new"))}
                    className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
                  >
                    New Council
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ModelPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={`Choose your ${activeWorkflowMeta.label.toLowerCase()} model${isMultiModel ? "s" : ""}`}
        subtitle={workflow === "chat" ? "One model per chat" : workflow === "council" ? "Independent perspectives" : "Side-by-side answers"}
        models={availableModels}
        selected={selectedIds}
        onToggle={toggleModel}
        singleSelect={workflow === "chat"}
        defaultModelId={workflow === "chat" ? defaultModelId : null}
        onSetDefault={workflow === "chat" ? setDefaultModelId : undefined}
      />

      {workflow === "council" && (
        <ModelPickerModal
          open={judgePickerOpen}
          onClose={() => setJudgePickerOpen(false)}
          title="Choose the judge"
          subtitle="Scores every panelist's answer and writes the verdict"
          models={availableModels.filter((m) => !selectedIds.has(m.id))}
          selected={judgeModelId ? new Set([judgeModelId]) : new Set<string>()}
          onToggle={(id) => setJudgeModelId(id)}
          singleSelect
        />
      )}
    </div>
  );
}
