import type { Metadata } from "next";
import Link from "next/link";
import { Icon, ICON_PATHS } from "@/components/icons";
import { LogoMark } from "@/components/LogoMark";
import { LIFETIME_PRICE_BDT } from "@/lib/pricing";

type IconName = keyof typeof ICON_PATHS;

const workflows: {
  label: string;
  title: string;
  description: string;
  href: string;
  icon: IconName;
  meta: string;
}[] = [
  {
    label: "Auto-pick",
    title: "Let the app choose",
    description:
      "Start with one prompt and let AI Model Council select a fitting model path for quality, speed, budget, coding, research, or free-only work.",
    href: "/chat",
    icon: "sparkle",
    meta: "Route receipt included",
  },
  {
    label: "One answer",
    title: "Ask a single model",
    description:
      "Use a clean chat when you already know the model you want, with streaming answers and model switching close at hand.",
    href: "/chat",
    icon: "chat",
    meta: "Focused chat",
  },
  {
    label: "Compare",
    title: "See answers side by side",
    description:
      "Send the same prompt to multiple models in parallel, then compare tone, reasoning, speed, and trade-offs without copy-paste.",
    href: "/compare",
    icon: "compare",
    meta: "Parallel runs",
  },
  {
    label: "Council verdict",
    title: "Get a judged final answer",
    description:
      "Convene independent model perspectives, pick a judge, surface disagreements, and finish with one synthesized verdict.",
    href: "/council",
    icon: "council",
    meta: "Judge model synthesis",
  },
];

const providers = ["OpenAI", "Anthropic", "Google", "xAI", "DeepSeek", "Meta", "Mistral", "Qwen", "Moonshot"];

const proofPoints = [
  { value: "300+", label: "OpenRouter models" },
  { value: "4", label: "ways to run one prompt" },
  { value: "0", label: "paid fallback in Free Mode" },
  { value: "BDT", label: "local lifetime pricing" },
];

const controlItems: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Live model catalog",
    body: "Browse providers, free models, context limits, pricing, and capabilities from the OpenRouter catalog.",
    icon: "models",
  },
  {
    title: "Current-answer research",
    body: "Turn on web research when a prompt needs fresh sources instead of static model memory.",
    icon: "globe",
  },
  {
    title: "Cost and history",
    body: "Track model status, estimated budget, token cost, latency, exports, and recent work from the app workspace.",
    icon: "history",
  },
];

export const metadata: Metadata = {
  title: "AI Model Council | One prompt, multiple AI workflows",
  description:
    "Ask once, then chat with one model, compare models side by side, or convene a judged AI council using your own OpenRouter key.",
};

function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-20 h-[500px] w-[960px] -translate-x-1/2 border border-border bg-surface/70 shadow-2xl sm:top-28" />
      <div className="absolute left-[6%] top-28 hidden w-64 border border-border bg-background/90 p-4 shadow-xl lg:block">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-2">AI Model Council</span>
          <span className="h-2 w-2 rounded-full bg-success" />
        </div>
        <div className="space-y-2">
          {["Chat", "Compare", "Council"].map((item, index) => (
            <div key={item} className="flex items-center justify-between border border-border bg-surface px-3 py-2">
              <span className="text-[12px] text-foreground">{item}</span>
              <span className={index === 2 ? "text-[11px] text-accent-text" : "text-[11px] text-muted-2"}>
                ready
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute right-[-80px] top-36 w-[520px] border border-border-strong bg-background/95 p-4 shadow-2xl sm:right-[5%]">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon path={ICON_PATHS.council} className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-foreground">Council run</p>
            <p className="text-[10px] text-muted-2">6 models plus judge</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {["Claude", "GPT", "Gemini", "Llama"].map((model, index) => (
            <div key={model} className="border border-border bg-surface px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">{model}</span>
                <span
                  className={
                    index === 0
                      ? "h-1.5 w-1.5 rounded-full bg-success"
                      : index === 1
                        ? "h-1.5 w-1.5 rounded-full bg-info"
                        : "h-1.5 w-1.5 rounded-full bg-warning"
                  }
                />
              </div>
              <div className="h-1.5 w-full bg-border" />
              <div className="mt-1.5 h-1.5 w-3/4 bg-border" />
            </div>
          ))}
        </div>
        <div className="mt-3 border border-accent/50 bg-accent-soft px-3 py-2 text-[11px] text-accent-text">
          Judge verdict: consensus strong, two caveats found.
        </div>
      </div>
      <div className="absolute bottom-[-80px] left-[12%] hidden w-[420px] border border-border bg-background/90 p-4 shadow-xl md:block">
        <p className="mb-3 text-[11px] text-muted-2">Transparent route receipt</p>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <span className="border border-border bg-surface px-2 py-2 text-info">provider</span>
          <span className="border border-border bg-surface px-2 py-2 text-success">tokens</span>
          <span className="border border-border bg-surface px-2 py-2 text-warning">cost</span>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 text-[12px] font-semibold uppercase text-accent-text">{eyebrow}</p>
      <h2 className="font-heading text-[34px] leading-[1.08] sm:text-[46px]">{title}</h2>
      <p className="mt-3 text-[14px] leading-6 text-muted">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative border-b border-border bg-background">
        <HeroScene />
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="AI Model Council home">
            <LogoMark className="h-7 w-7 text-foreground" />
            <span className="text-[15px] font-semibold">AI Model Council</span>
          </Link>
          <nav className="hidden items-center gap-5 text-[13px] text-muted md:flex" aria-label="Primary navigation">
            <a href="#workflows" className="hover:text-foreground">
              Workflows
            </a>
            <a href="#free-mode" className="hover:text-foreground">
              Free Mode
            </a>
            <Link href="/models" className="hover:text-foreground">
              Models
            </Link>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login?next=%2Fcouncil"
              className="hidden text-[13px] font-medium text-muted hover:text-foreground sm:inline"
            >
              Log in
            </Link>
            <Link
              href="/council"
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Open app
              <Icon path={ICON_PATHS.arrowRight} className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[72svh] max-w-6xl flex-col justify-center px-4 pb-16 pt-10 sm:px-6 lg:pb-20">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[12px] font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              300+ AI models via your OpenRouter key
            </p>
            <h1 className="font-heading text-[42px] leading-none sm:text-[72px] lg:text-[86px]">AI Model Council</h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-7 text-muted sm:text-[19px]">
              One prompt can become a single answer, a side-by-side comparison, an automatic model pick, or a judged
              council verdict. Use the strongest model path for the job without rebuilding your workflow every time.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/council"
                className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
              >
                Start a council
                <Icon path={ICON_PATHS.arrowRight} className="h-4 w-4" />
              </Link>
              <Link
                href="/compare"
                className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-background/80 px-5 py-3 text-[14px] font-semibold text-foreground transition-colors hover:border-border-strong"
              >
                Compare models
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-4">
            {proofPoints.map((point) => (
              <div key={point.label} className="border border-border bg-background/75 px-4 py-3">
                <p className="font-mono text-[20px] text-foreground">{point.value}</p>
                <p className="mt-1 text-[12px] text-muted-2">{point.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflows" className="border-b border-border bg-surface px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            eyebrow="One prompt, four paths"
            title="Choose the amount of scrutiny each question deserves."
            body="Move from quick chat to parallel comparison to a judged council without changing products. The same app carries the prompt, model selection, status, and history."
          />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {workflows.map((workflow) => (
              <Link
                key={workflow.label}
                href={workflow.href}
                className="group flex min-h-[260px] flex-col justify-between border border-border bg-background p-5 transition-colors hover:border-accent/70"
              >
                <div>
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent-text">
                      <Icon path={ICON_PATHS[workflow.icon]} className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] text-muted-2">{workflow.meta}</span>
                  </div>
                  <p className="mb-2 text-[12px] font-semibold uppercase text-accent-text">{workflow.label}</p>
                  <h3 className="text-[19px] font-semibold leading-snug">{workflow.title}</h3>
                  <p className="mt-3 text-[13px] leading-6 text-muted">{workflow.description}</p>
                </div>
                <span className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-accent-text">
                  Open workflow
                  <Icon path={ICON_PATHS.arrowRight} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="free-mode" className="border-b border-border bg-background px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase text-accent-text">Free Mode</p>
            <h2 className="font-heading text-[34px] leading-[1.08] sm:text-[46px]">
              Explore multiple models while keeping paid usage locked out.
            </h2>
            <p className="mt-4 text-[14px] leading-6 text-muted">
              Flip on free-model routing and the app limits Chat, Compare, Council, and auto-selection to zero-cost
              OpenRouter-compatible models. Paid and mixed routing stay out of the run until you turn Free Mode off.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Free chat", "Free compare", "Free council", "Free auto-pick"].map((item) => (
                <span key={item} className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-muted">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["No paid fallback", "The free-only switch is a constraint, not a suggestion."],
              ["Catalog aware", "Free model availability refreshes from the model catalog."],
              ["Transparent trade-offs", "The app keeps cost, speed, and model status visible as runs complete."],
              ["BYOK ready", "Use your own OpenRouter key when you want the full catalog."],
            ].map(([title, body]) => (
              <div key={title} className="border border-border bg-surface p-5">
                <Icon path={ICON_PATHS.check} className="mb-4 h-5 w-5 text-success" />
                <h3 className="text-[16px] font-semibold">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            eyebrow="Catalog and control"
            title="Bring the key. Keep the visibility."
            body="The license buys the software. Your models run through your own OpenRouter key, so provider choice, model usage, and spend stay under your control."
          />
          <div className="mb-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
            {providers.map((provider, index) => (
              <div key={provider} className="border border-border bg-background px-3 py-3 text-center">
                <span
                  className={
                    index % 3 === 0
                      ? "mx-auto mb-2 block h-2 w-8 bg-info"
                      : index % 3 === 1
                        ? "mx-auto mb-2 block h-2 w-8 bg-success"
                        : "mx-auto mb-2 block h-2 w-8 bg-warning"
                  }
                />
                <span className="text-[12px] text-muted">{provider}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {controlItems.map((item) => (
              <div key={item.title} className="border border-border bg-background p-5">
                <Icon path={ICON_PATHS[item.icon]} className="mb-4 h-5 w-5 text-accent" />
                <h3 className="text-[17px] font-semibold">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-background px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_0.85fr] lg:items-stretch">
          <div className="border border-accent bg-surface p-6 sm:p-8">
            <p className="mb-2 text-[12px] font-semibold uppercase text-accent-text">Simple pricing</p>
            <h2 className="font-heading text-[34px] leading-[1.08] sm:text-[46px]">Lifetime access for Bangladesh.</h2>
            <p className="mt-4 max-w-2xl text-[14px] leading-6 text-muted">
              Pay once for the product, then run models on your own key. No per-answer markup from AI Model Council.
            </p>
            <div className="mt-7 flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] text-muted-2">Lifetime license</p>
                <p className="mt-1 font-mono text-[42px] leading-none">BDT {LIFETIME_PRICE_BDT}</p>
                <p className="mt-2 text-[13px] text-muted">One-time payment via SSLCommerz.</p>
              </div>
              <Link
                href="/subscribe"
                className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
              >
                See pricing
                <Icon path={ICON_PATHS.arrowRight} className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="border border-border bg-surface p-6 sm:p-8">
            <p className="mb-2 text-[12px] font-semibold uppercase text-accent-text">OpenRouter BYOK</p>
            <h3 className="text-[24px] font-semibold leading-tight">One key unlocks the catalog.</h3>
            <p className="mt-4 text-[14px] leading-6 text-muted">
              Add your key once in the workspace. Use paid models when you choose, or keep Free Mode on for zero-cost
              compatible models.
            </p>
            <div className="mt-6 space-y-3 text-[13px] text-muted">
              {["Open app", "Paste key", "Run chat, compare, or council"].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border font-mono text-[12px] text-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-[12px] text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5 text-foreground" />
            <span>AI Model Council</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/council" className="hover:text-foreground">
              App
            </Link>
            <Link href="/models" className="hover:text-foreground">
              Models
            </Link>
            <Link href="/subscribe" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login?next=%2Fcouncil" className="hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
