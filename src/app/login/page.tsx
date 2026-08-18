import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { signInAction, signInWithGoogleAction, signUpAction } from "./actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.32-.17-1.94H10v3.68h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.32 2.99-7.26Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.61-2.41l-3.23-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.8-1.75-5.59-4.11H1.07v2.59A10 10 0 0 0 10 20Z"
      />
      <path fill="#FBBC05" d="M4.41 11.93a5.99 5.99 0 0 1 0-3.86V5.48H1.07a10 10 0 0 0 0 9.04l3.34-2.59Z" />
      <path
        fill="#EA4335"
        d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.96 9.96 0 0 0 10 0 10 10 0 0 0 1.07 5.48l3.34 2.59C5.2 5.71 7.4 3.96 10 3.96Z"
      />
    </svg>
  );
}

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

          <form action={signInWithGoogleAction}>
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

          <div className="my-4 flex items-center gap-2 text-[11px] text-muted-2">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={mode === "signup" ? signUpAction : signInAction} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />

            {mode === "signup" && (
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-muted">Full name</span>
                <input
                  type="text"
                  name="fullName"
                  required
                  autoComplete="name"
                  className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
                  placeholder="Ada Lovelace"
                />
              </label>
            )}

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

            {mode === "signup" && (
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-muted">Phone number</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
                  placeholder="+1 555 000 0000"
                />
              </label>
            )}

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

            {mode === "signup" && (
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-muted">What will you use it for?</span>
                <select
                  name="useCase"
                  defaultValue=""
                  className="rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
                >
                  <option value="" disabled>
                    Select one
                  </option>
                  <option value="research">Research</option>
                  <option value="coding">Coding</option>
                  <option value="comparing_models">Comparing AI models</option>
                  <option value="writing">Writing / content</option>
                  <option value="work">Work / business</option>
                  <option value="personal">Personal / curiosity</option>
                  <option value="other">Other</option>
                </select>
              </label>
            )}

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
