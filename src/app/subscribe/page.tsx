"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/client/useCurrentUser";
import { Icon, ICON_PATHS } from "@/components/icons";

const FEATURES = [
  "Council: every model debates, blind judging, one synthesized verdict",
  "Compare: side-by-side answers from multiple models at once",
  "Named combos (Quality leaders, Budget smart, Coding squad, and more)",
];

export default function SubscribePage() {
  const { user, loading } = useCurrentUser();
  const [requested, setRequested] = useState(false);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-[22px] font-semibold">Upgrade to Council + Compare</h1>
      <p className="mb-6 text-[13px] text-muted-2">
        Chat stays free for every signed-in account. These two workflows need a subscription.
      </p>

      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <ul className="space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
              <Icon path={ICON_PATHS.check} className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-muted-2">
          You still bring your own OpenRouter API key — a subscription unlocks the workflows, not model usage cost.
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

      {!loading && user && (
        <div className="rounded-xl border border-border bg-background p-4">
          {requested ? (
            <p className="text-[13px] text-success">
              Thanks — we&rsquo;ll reach out at {user.email} once payment is live.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[13px] text-muted-2">
                Payment isn&rsquo;t connected yet, so subscriptions aren&rsquo;t purchasable this moment. Let us know
                you&rsquo;re interested and we&rsquo;ll follow up the moment it&rsquo;s live.
              </p>
              <button
                onClick={() => setRequested(true)}
                className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent-hover"
              >
                Notify me when it&rsquo;s ready
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
