"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/authClient";
import { LogoMark } from "@/components/LogoMark";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim().length < 6) return;
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    // supabase-js picks up the recovery session automatically from the URL
    // (the reset-link redirect includes it) — updateUser applies to that
    // session directly, no separate token handling needed here.
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-7 shadow-lg">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark className="h-6 w-6 text-foreground" />
          <span className="text-[16px] font-semibold tracking-tight">Model Council</span>
        </div>

        {done ? (
          <>
            <h1 className="mb-1.5 font-heading text-[26px] leading-tight tracking-tight">Password updated</h1>
            <p className="mb-6 text-[13px] text-muted-2">You can now sign in with your new password.</p>
            <button
              onClick={() => router.push("/login")}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-3 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Go to sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="mb-1.5 font-heading text-[26px] leading-tight tracking-tight">Set a new password</h1>
            <p className="mb-6 text-[13px] text-muted-2">Choose a new password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-2 focus:border-accent"
                />
              </div>

              <button
                type="submit"
                disabled={loading || password.trim().length < 6}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-3 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>

            {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
