import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { signInAction, signUpAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const next = params.next && params.next.startsWith("/") ? params.next : "/";

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-8 w-8 text-foreground" />
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight">Model Council</h1>
            <p className="text-[13px] text-muted">
              {mode === "signup" ? "Create an account to get started." : "Sign in to continue."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex rounded-lg border border-border bg-background p-0.5 text-[13px]">
            <Link
              href={`/login?mode=signin&next=${encodeURIComponent(next)}`}
              className={`flex-1 rounded-md py-1.5 text-center transition-colors ${
                mode === "signin" ? "bg-surface font-medium text-foreground" : "text-muted"
              }`}
            >
              Sign in
            </Link>
            <Link
              href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
              className={`flex-1 rounded-md py-1.5 text-center transition-colors ${
                mode === "signup" ? "bg-surface font-medium text-foreground" : "text-muted"
              }`}
            >
              Create account
            </Link>
          </div>

          {params.notice && (
            <p className="mb-3 rounded-md border border-info-soft bg-info-soft px-3 py-2 text-[12px] text-foreground">
              {params.notice}
            </p>
          )}
          {params.error && (
            <p className="mb-3 rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-[12px] text-danger">
              {params.error}
            </p>
          )}

          <form action={mode === "signup" ? signUpAction : signInAction} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-muted">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-muted">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              />
            </label>

            <button
              type="submit"
              className="mt-1 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-2">
          Your OpenRouter key is added separately after signing in and stays yours — it never touches our
          servers&rsquo; storage.
        </p>
      </div>
    </div>
  );
}
