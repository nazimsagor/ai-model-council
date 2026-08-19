"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/authClient";
import { LogoMark } from "@/components/LogoMark";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
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
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="#181717" aria-hidden>
      <path d="M10 0C4.48 0 0 4.58 0 10.24c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.19-1.11-1.51-1.11-1.51-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.34 9.34 0 0 1 2.5-.34c.85 0 1.7.11 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.03 10.03 0 0 0 20 10.24C20 4.58 15.52 0 10 0Z" />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const next = searchParams.get("next") ?? "/";

  async function signInWithProvider(provider: "google" | "github") {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();

    if (mode === "forgot") {
      if (!email.trim()) return;
      setLoading(true);
      setError(null);
      setNotice(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setNotice("If that email has an account, a reset link is on its way — check your inbox.");
      return;
    }

    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() || undefined } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        setNotice("Check your email to confirm your account, then sign in.");
        setLoading(false);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-7 shadow-lg">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark className="h-6 w-6 text-foreground" />
          <span className="text-[16px] font-semibold tracking-tight">Model Council</span>
        </div>

        {mode !== "forgot" && (
          <div className="mb-6 flex rounded-full border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition-colors ${
                mode === "signin" ? "bg-surface text-foreground shadow-sm" : "text-muted-2 hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition-colors ${
                mode === "signup" ? "bg-surface text-foreground shadow-sm" : "text-muted-2 hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>
        )}

        <h1 className="mb-1.5 font-heading text-[26px] leading-tight tracking-tight">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Get started free" : "Reset your password"}
        </h1>
        <p className="mb-6 text-[13px] text-muted-2">
          {mode === "signin"
            ? "Sign in to access your Model Council workspace."
            : mode === "signup"
              ? "Create an account to start using Model Council."
              : "Enter your email and we'll send you a reset link."}
        </p>

        {mode !== "forgot" && (
          <>
            <div className="space-y-2.5">
              <button
                onClick={() => signInWithProvider("google")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-white px-4 py-3 text-[14px] font-semibold text-[#1a1a1a] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <button
                onClick={() => signInWithProvider("github")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-white px-4 py-3 text-[14px] font-semibold text-[#1a1a1a] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <GitHubIcon />
                Continue with GitHub
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-2">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-2 focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-2 focus:border-accent"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[12px] font-medium text-foreground">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-[11px] text-accent-text hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signin" ? "••••••••" : "Min. 6 characters"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-2 focus:border-accent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || (mode !== "forgot" && !password.trim())}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-3 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
            {!loading && <span aria-hidden>→</span>}
          </button>
        </form>

        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
        {notice && <p className="mt-3 text-[12px] text-success">{notice}</p>}

        {mode === "forgot" ? (
          <p className="mt-4 text-center text-[12px] text-muted-2">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
              className="font-semibold text-accent-text hover:underline"
            >
              ← Back to sign in
            </button>
          </p>
        ) : (
          <p className="mt-4 text-center text-[12px] text-muted-2">
            {mode === "signin" ? "New here? " : "Already have one? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
              className="font-semibold text-accent-text hover:underline"
            >
              {mode === "signin" ? "Create one →" : "Sign in →"}
            </button>
          </p>
        )}

        <p className="mt-4 text-center text-[11px] text-muted-2">
          Free models are free once you sign in.
          <br />
          Paid models need a subscription.
        </p>
      </div>
    </div>
  );
}
