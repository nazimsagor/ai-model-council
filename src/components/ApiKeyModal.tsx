"use client";

import { useEffect, useState } from "react";
import { useAppSettings } from "@/lib/client/appSettings";

interface KeyInfo {
  label: string;
  limit: number | null;
  limitRemaining: number | null;
  usage: number;
  isFreeTier: boolean;
}

export function ApiKeyModal() {
  const { apiKey, setApiKey, hasApiKey, keyModalOpen, closeKeyModal } = useAppSettings();
  const [draft, setDraft] = useState(apiKey);
  const [reveal, setReveal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);

  // Re-sync the draft from stored state each time the modal opens.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (keyModalOpen) {
      setDraft(apiKey);
      setKeyInfo(null);
      setCheckError(null);
    }
  }, [keyModalOpen, apiKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    setKeyInfo(null);
    setCheckError(null);
  }

  async function handleVerify() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setChecking(true);
    setCheckError(null);
    setKeyInfo(null);
    try {
      const res = await fetch("/api/openrouter/key-info", {
        headers: { "x-openrouter-key": trimmed },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not verify this key.");
      setKeyInfo(json);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
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
            onChange={(e) => {
              setDraft(e.target.value);
              setKeyInfo(null);
              setCheckError(null);
            }}
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

        <div className="mt-2 flex items-center justify-between">
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-accent-text hover:underline"
          >
            Get a key from openrouter.ai/keys →
          </a>
          <button
            onClick={handleVerify}
            disabled={!draft.trim() || checking}
            className="text-[11px] font-medium text-accent-text hover:underline disabled:opacity-40"
            type="button"
          >
            {checking ? "Checking…" : "Verify key"}
          </button>
        </div>

        {checkError && (
          <p className="mt-2 rounded-md border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[11px] text-danger">
            {checkError}
          </p>
        )}

        {keyInfo && (
          <div className="mt-2 rounded-md border border-success-soft bg-success-soft px-2.5 py-2 text-[11px] text-foreground">
            <p className="font-medium text-success">Key is valid and active.</p>
            <p className="mt-0.5 text-muted">
              Used so far: ${keyInfo.usage.toFixed(2)}
              {keyInfo.limitRemaining !== null && <> · Remaining: ${keyInfo.limitRemaining.toFixed(2)}</>}
              {keyInfo.isFreeTier && <> · Free tier (no credits purchased yet)</>}
            </p>
          </div>
        )}

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
