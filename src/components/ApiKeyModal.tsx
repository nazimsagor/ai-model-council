"use client";

import { useEffect, useState } from "react";
import { useAppSettings } from "@/lib/client/appSettings";

export function ApiKeyModal() {
  const { apiKey, setApiKey, hasApiKey, keyModalOpen, closeKeyModal } = useAppSettings();
  const [draft, setDraft] = useState(apiKey);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    // Re-sync the draft from stored state each time the modal opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (keyModalOpen) setDraft(apiKey);
  }, [keyModalOpen, apiKey]);

  useEffect(() => {
    if (!keyModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeKeyModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyModalOpen, closeKeyModal]);

  if (!keyModalOpen) return null;

  function handleSave() {
    setApiKey(draft.trim());
    closeKeyModal();
  }

  function handleClear() {
    setApiKey("");
    setDraft("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={closeKeyModal}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold">Your OpenRouter API key</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Every council run is billed to your own OpenRouter account. Your key stays in this
          browser&rsquo;s local storage and is only sent to our server to relay your requests — it is
          never saved in our database or logs.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <input
            type={reveal ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-or-v1-…"
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            name="openrouter-key-field-do-not-autofill"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          />
          <button
            onClick={() => setReveal((v) => !v)}
            className="shrink-0 text-[11px] text-muted hover:text-foreground"
            type="button"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>

        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[11px] text-accent hover:underline"
        >
          Get a key from openrouter.ai/keys →
        </a>

        <div className="mt-4 flex items-center justify-between">
          {hasApiKey ? (
            <button onClick={handleClear} className="text-[12px] text-danger hover:underline" type="button">
              Remove key
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={closeKeyModal}
              className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:text-foreground"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-40"
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
