"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCurrentUser } from "./useCurrentUser";

const STORAGE_KEY = "openrouter_api_key";
const DEFAULT_MODEL_KEY = "council_default_chat_model";

interface AppSettings {
  freeModelsOnly: boolean;
  setFreeModelsOnly: (v: boolean) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  hasApiKey: boolean;
  keyModalOpen: boolean;
  openKeyModal: () => void;
  closeKeyModal: () => void;
  defaultModelId: string | null;
  setDefaultModelId: (id: string | null) => void;
}

const AppSettingsContext = createContext<AppSettings | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const [freeModelsOnly, setFreeModelsOnly] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [defaultModelId, setDefaultModelIdState] = useState<string | null>(null);

  useEffect(() => {
    // One-time sync from browser localStorage on mount — can't read it during
    // the initial render because it isn't available server-side. This is
    // only the pre-login fallback; a signed-in account's saved key (below)
    // takes over once it loads.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedDefault = window.localStorage.getItem(DEFAULT_MODEL_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setApiKeyState(stored);
    if (storedDefault) setDefaultModelIdState(storedDefault);
  }, []);

  // Once signed in, the account's saved key (if any) becomes the source of
  // truth — it follows the user to any device they sign into, unlike the
  // browser-local fallback above.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/settings/key")
      .then((r) => r.json())
      .then((json: { key?: string | null }) => {
        if (cancelled) return;
        if (json.key) {
          setApiKeyState(json.key);
        } else if (apiKey) {
          // First sign-in with a key already typed locally (pre-login) —
          // save it to the account now so it's remembered next time.
          fetch("/api/settings/key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: apiKey }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only re-sync when the login transition itself happens, not on every
    // apiKey keystroke — apiKey is read for its value at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function setApiKey(v: string) {
    setApiKeyState(v);
    if (v) window.localStorage.setItem(STORAGE_KEY, v);
    else window.localStorage.removeItem(STORAGE_KEY);
    if (user) {
      fetch("/api/settings/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: v }),
      }).catch(() => {});
    }
  }

  function setDefaultModelId(id: string | null) {
    setDefaultModelIdState(id);
    if (id) window.localStorage.setItem(DEFAULT_MODEL_KEY, id);
    else window.localStorage.removeItem(DEFAULT_MODEL_KEY);
  }

  return (
    <AppSettingsContext.Provider
      value={{
        freeModelsOnly,
        setFreeModelsOnly,
        apiKey,
        setApiKey,
        hasApiKey: apiKey.length > 0,
        keyModalOpen,
        openKeyModal: () => setKeyModalOpen(true),
        closeKeyModal: () => setKeyModalOpen(false),
        defaultModelId,
        setDefaultModelId,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
