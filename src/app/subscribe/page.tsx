"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/client/useCurrentUser";
import { Icon, ICON_PATHS } from "@/components/icons";

const MONTHLY_PRICE_BDT = 499;

const FEATURES = [
  "Every paid model on OpenRouter — GPT, Claude, Gemini, Grok, and more",
  "Use them in Chat, Compare, and Council — same free features, no lock",
  "All free models stay free for every signed-in account, no subscription needed",
];

function StatusBanner() {
  const params = useSearchParams();
  const status = params.get("status");
  if (!status) return null;

  if (status === "success") {
    return (
      <p className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
        Payment received — your subscription is active.
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

export default function SubscribePage() {
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
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-[22px] font-semibold">Upgrade to paid models</h1>
      <p className="mb-6 text-[13px] text-muted-2">
        Free models are free for every signed-in account. Paid models need a subscription.
      </p>

      <Suspense fallback={null}>
        <StatusBanner />
      </Suspense>

      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-[15px] font-semibold">৳{MONTHLY_PRICE_BDT} / month</p>
        <ul className="space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
              <Icon path={ICON_PATHS.check} className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-muted-2">
          You still bring your own OpenRouter API key — a subscription unlocks which models you can pick, not model
          usage cost itself. Billed via card, bKash, Nagad, or Rocket through SSLCommerz.
        </p>
      </div>

      {!loading && !user && (
        <p className="text-[13px] text-muted-2">
          <Link href="/login" className="text-accent-text hover:underline">
            Sign in
          </Link>{" "}
          first to subscribe.
        </p>
      )}

      {!loading && user && user.isSubscribed && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-[13px] text-success">
          You&rsquo;re subscribed
          {user.subscriptionExpiresAt && (
            <> — renews or expires {new Date(user.subscriptionExpiresAt).toLocaleDateString()}.</>
          )}
        </div>
      )}

      {!loading && user && !user.isSubscribed && (
        <div className="rounded-xl border border-border bg-background p-4">
          {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
          <button
            onClick={startCheckout}
            disabled={starting}
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {starting ? "Starting checkout…" : `Subscribe — ৳${MONTHLY_PRICE_BDT}/month`}
          </button>
        </div>
      )}
    </div>
  );
}
