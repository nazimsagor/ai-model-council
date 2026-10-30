"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSettings } from "@/lib/client/appSettings";
import { savePendingPrompt } from "@/lib/client/pendingPrompt";
import { Icon, ICON_PATHS } from "@/components/icons";

type HomeWorkflow = "chat" | "compare" | "council" | "auto";

const OPTIONS: {
  id: HomeWorkflow;
  label: string;
  desc: string;
  icon: keyof typeof ICON_PATHS;
  placeholder: string;
}[] = [
  {
    id: "chat",
    label: "Chat",
    desc: "One model, one ongoing conversation",
    icon: "chat",
    placeholder: "What do you want one model to answer?",
  },
  {
    id: "compare",
    label: "Compare",
    desc: "Independent answers, side by side",
    icon: "compare",
    placeholder: "What should several models answer side by side?",
  },
  {
    id: "council",
    label: "Council",
    desc: "Many perspectives, one judged verdict",
    icon: "council",
    placeholder: "What do you want the council to decide?",
  },
  {
    id: "auto",
    label: "Auto-route",
    desc: "Bohumot picks the right model",
    icon: "sparkle",
    placeholder: "Describe the task and Bohumot will pick the model.",
  },
];

const EXAMPLES: { label: string; prompt: string; workflow: HomeWorkflow }[] = [
  {
    label: "Rewrite an email",
    prompt: "Rewrite this email so it sounds friendly but firm:\n\n",
    workflow: "chat",
  },
  {
    label: "Compare frameworks",
    prompt: "Compare Next.js, Remix and Astro for a content-heavy marketing site, then recommend one.",
    workflow: "compare",
  },
  {
    label: "Make a decision",
    prompt:
      "Should a small Bangladeshi online shop use bKash, SSLCommerz, or both? Weigh fees, setup effort and customer trust.",
    workflow: "council",
  },
  {
    label: "Debug code",
    prompt: "Explain why this code is slow and how to fix it:\n\n",
    workflow: "auto",
  },
];

const ROUTES: Record<HomeWorkflow, string> = {
  chat: "/chat",
  compare: "/compare",
  council: "/council",
  auto: "/chat",
};

export function HomeComposer() {
  const router = useRouter();
  const { freeModelsOnly } = useAppSettings();
  const [workflow, setWorkflow] = useState<HomeWorkflow>("chat");
  const [prompt, setPrompt] = useState("");

  const active = OPTIONS.find((o) => o.id === workflow)!;
  const canSend = prompt.trim().length > 0;

  function send() {
    const text = prompt.trim();
    if (!text) return;
    savePendingPrompt({ prompt: text, autoRoute: workflow === "auto" });
    router.push(ROUTES[workflow]);
  }

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[760px] px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            300+ models · one prompt · your choice of workflow
          </span>
          <h1 className="mt-5 font-heading text-[34px] leading-[1.08] sm:text-[44px]">
            Ask once.
            <br />
            <span className="text-accent-text">Let the right model answer.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[14px] leading-6 text-muted sm:text-[15px]">
            Write your prompt and choose how to run it: one model, a side-by-side comparison, a judged council, or let
            Bohumot route it for you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWorkflow("auto")}
          className="mt-8 flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/60"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent">
            <Icon path={ICON_PATHS.sparkle} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-[13px] text-muted">
            <span className="font-semibold text-foreground">Not sure which workflow?</span> Auto-route reads your
            prompt and picks a fitting model.
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-[12px] font-semibold text-accent-text sm:flex">
            Use Auto-route
            <Icon path={ICON_PATHS.arrowRight} className="h-3.5 w-3.5" />
          </span>
        </button>

        <div className="mt-7">
          <p className="text-[13px] font-semibold text-foreground">Choose how Bohumot should run it</p>
          <p className="mt-0.5 text-[12px] text-muted-2">You can fine-tune models and settings on the next screen.</p>
        </div>

        <div role="radiogroup" aria-label="Workflow" className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {OPTIONS.map((o) => {
            const selected = workflow === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setWorkflow(o.id)}
                className={`relative flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    selected ? "bg-accent text-on-accent" : "bg-background text-accent-text"
                  }`}
                >
                  <Icon path={ICON_PATHS[o.icon]} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-semibold ${selected ? "text-accent-text" : "text-foreground"}`}>
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-2">{o.desc}</span>
                </span>
                {selected && (
                  <Icon path={ICON_PATHS.check} className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-accent-text" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-surface p-2 shadow-sm transition-colors focus-within:border-accent">
          <label htmlFor="home-prompt" className="sr-only">
            Type your prompt
          </label>
          <textarea
            id="home-prompt"
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={active.placeholder}
            rows={4}
            // The wrapper's accent border already shows focus; the global
            // :focus-visible outline is unlayered, so a utility can't override it.
            style={{ outline: "none" }}
            className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[14px] placeholder:text-muted-2"
          />
          <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
            <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-2">
              <Icon path={ICON_PATHS[active.icon]} className="h-3.5 w-3.5 text-accent-text" />
              <span className="truncate">{active.label}</span>
              {freeModelsOnly && (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-text">
                  <Icon path={ICON_PATHS.bolt} className="h-3 w-3" filled />
                  Free models only
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label={`Send with ${active.label}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-muted-2"
            >
              <Icon path={ICON_PATHS.arrowUp} className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-center text-[12px] text-muted-2">
          <span className="font-semibold text-accent-text">{active.label}</span> is ready · Enter to send · Shift + Enter
          for a new line
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[12px] text-muted-2">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setWorkflow(ex.workflow);
                setPrompt(ex.prompt);
              }}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent/60 hover:text-foreground"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
