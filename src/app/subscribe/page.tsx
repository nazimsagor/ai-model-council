"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/client/useCurrentUser";
import { Icon, ICON_PATHS } from "@/components/icons";
import { LIFETIME_PRICE_BDT } from "@/lib/pricing";

const FEATURES = [
  "Lifetime access to AI Model Council",
  "Bring your own OpenRouter key",
  "Chat, Compare, and Council — every workflow",
  "300+ models via OpenRouter, always current",
  "Free-model mode included",
  "One-time payment, no subscription",
];

function StatusBanner() {
  const params = useSearchParams();
  const status = params.get("status");
  if (!status) return null;

  if (status === "success") {
    return (
      <p className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
        Payment received — you have lifetime access now.
      </p>
    );
  }
  if (status === "fail") {
    return (
      <p className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
        Payment failed. No charge was made — try again below.
      </p>
    );
  }
  if (status === "cancel") {
    return (
      <p className="mb-6 rounded-lg border border-border bg-surface px-4 py-3 text-[13px] text-muted-2">
        Payment cancelled. No charge was made.
      </p>
    );
  }
  return null;
}

function PricingCard() {
  const { user, loading } = useCurrentUser();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/subscribe/init", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start payment");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
      setStarting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent bg-surface p-6">
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-text">
        <Icon path={ICON_PATHS.sparkle} className="h-3.5 w-3.5" />
        Lifetime license
      </span>

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Bangladesh · BDT</p>
      <p className="mb-5 flex items-baseline gap-1.5">
        <span className="text-[40px] font-bold leading-none">৳{LIFETIME_PRICE_BDT}</span>
        <span className="text-[13px] text-muted-2">once</span>
      </p>

      <div className="mb-5 border-t border-border" />

      <ul className="mb-6 space-y-2.5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
            <Icon path={ICON_PATHS.check} className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {f}
          </li>
        ))}
      </ul>

      {!loading && !user && (
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-on-accent hover:bg-accent-hover"
        >
          Sign in to get lifetime access
          <Icon path={ICON_PATHS.arrowRight} className="h-4 w-4" />
        </Link>
      )}

      {!loading && user && user.isSubscribed && (
        <div className="rounded-full border border-success/30 bg-success/10 px-4 py-2.5 text-center text-[13px] font-medium text-success">
          You already have lifetime access
        </div>
      )}

      {!loading && user && !user.isSubscribed && (
        <>
          {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
          <button
            onClick={startCheckout}
            disabled={starting}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {starting ? "Starting checkout…" : "Get lifetime access"}
            {!starting && <Icon path={ICON_PATHS.arrowRight} className="h-4 w-4" />}
          </button>
        </>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-2">Card, bKash, Nagad, or Rocket via SSLCommerz.</p>
    </div>
  );
}

function RedeemCard() {
  const { user, loading } = useCurrentUser();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not redeem code");
      // Full reload, not router.push: useCurrentUser only fetches /api/me on
      // mount, so a client-side nav would still show the pre-redeem state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/council";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not redeem code");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = loading || !user || !code.trim() || submitting || user?.isSubscribed;

  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <p className="mb-1 text-[16px] font-semibold">Got a code? Redeem now</p>
      <p className="mb-5 text-[13px] text-muted-2">
        Paste the discount code you received to activate free lifetime access.
      </p>

      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="mb-1.5 block text-[12px] font-semibold text-foreground">Enter the discount code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. EARLYBD100"
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] uppercase text-foreground outline-none placeholder:text-muted-2 placeholder:normal-case focus:border-accent"
        />
        {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
        {!loading && !user ? (
          <p className="text-[13px] text-muted-2">
            <Link href="/login" className="text-accent-text hover:underline">
              Sign in
            </Link>{" "}
            first to redeem a code.
          </p>
        ) : (
          <button
            onClick={redeem}
            disabled={disabled}
            className="w-full rounded-lg bg-surface-raised px-4 py-2.5 text-[13px] font-semibold text-foreground hover:bg-border disabled:opacity-50"
          >
            {submitting ? "Redeeming…" : "Get lifetime access for free"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent-text">Lifetime access</p>
        <h1 className="mb-2 text-[32px] font-bold leading-tight">Get AI Model Council for life.</h1>
        <p className="mx-auto max-w-md text-[13px] text-muted-2">
          No subscription, no seats, no per-answer fees. You bring your own OpenRouter key, so model usage is billed
          straight to you at cost.
        </p>
      </div>

      <Suspense fallback={null}>
        <StatusBanner />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <PricingCard />
        <RedeemCard />
      </div>
    </div>
  );
}
