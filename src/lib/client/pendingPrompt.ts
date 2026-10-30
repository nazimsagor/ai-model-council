// Hands a prompt typed on /home over to the Chat/Compare/Council workspace.
// sessionStorage (not the URL) so prompts never end up in links, history, or
// server logs — and it survives the /login round-trip for signed-out users.
const KEY = "bohumot:pending-prompt";

export interface PendingPrompt {
  prompt: string;
  // Auto-route: ignore any saved default model and let auto-select pick one.
  autoRoute: boolean;
}

export function savePendingPrompt(pending: PendingPrompt) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Storage blocked (private mode etc.) — the workspace just opens empty.
  }
}

export function takePendingPrompt(): PendingPrompt | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<PendingPrompt>;
    if (typeof parsed.prompt !== "string" || !parsed.prompt.trim()) return null;
    return { prompt: parsed.prompt, autoRoute: parsed.autoRoute === true };
  } catch {
    return null;
  }
}
