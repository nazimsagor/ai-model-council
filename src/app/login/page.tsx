"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/authClient";
import { LogoMark } from "@/components/LogoMark";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const next = searchParams.get("next") ?? "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-7 shadow-lg">
        <div className="mb-8 flex items-center gap-2">
          <LogoMark className="h-6 w-6 text-foreground" />
          <span className="text-[16px] font-semibold tracking-tight">Model Council</span>
        </div>

        <h1 className="mb-1.5 font-heading text-[26px] leading-tight tracking-tight">Welcome back</h1>
        <p className="mb-7 text-[13px] text-muted-2">Sign in to access your Model Council workspace.</p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-white px-4 py-3 text-[14px] font-semibold text-[#1a1a1a] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path
              fill="#4285F4"
              d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.97-4.32 2.97-7.31Z"
            />
            <path
              fill="#34A853"
              d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.07v2.59A10 10 0 0 0 10 20Z"
            />
            <path fill="#FBBC05" d="M4.41 11.9a5.99 5.99 0 0 1 0-3.8V5.51H1.07a10 10 0 0 0 0 8.98l3.34-2.59Z" />
            <path
              fill="#EA4335"
              d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.96 9.96 0 0 0 10 0 10 10 0 0 0 1.07 5.51l3.34 2.59C5.2 5.74 7.4 3.98 10 3.98Z"
            />
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}

        <p className="mt-6 text-center text-[11px] text-muted-2">
          Free models are free once you sign in.
          <br />
          Paid models need a subscription.
        </p>
      </div>
    </div>
  );
}
