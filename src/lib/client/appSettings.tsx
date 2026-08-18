"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "openrouter_api_key";

interface AppSettings {
  freeModelsOnly: boolean;
  setFreeModelsOnly: (v: boolean) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  hasApiKey: boolean;
  keyModalOpen: boolean;
  openKeyModal: () => void;
  closeKeyModal: () => void;
}

const AppSettingsContext = createContext<AppSettings | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [freeModelsOnly, setFreeModelsOnly] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  useEffect(() => {
    // One-time sync from browser localStorage on mount — can't read it during
    // the initial render because it isn't available server-side.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setApiKeyState(stored);
  }, []);

  function setApiKey(v: string) {
    setApiKeyState(v);
    if (v) window.localStorage.setItem(STORAGE_KEY, v);
    else window.localStorage.removeItem(STORAGE_KEY);
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
