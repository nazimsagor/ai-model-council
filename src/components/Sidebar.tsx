"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { RunListItem } from "@/lib/repository";
import { useAppSettings } from "@/lib/client/appSettings";
import { Icon, ICON_PATHS } from "@/components/icons";
import { LogoMark } from "@/components/LogoMark";

function NavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: keyof typeof ICON_PATHS;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 border-l-2 py-2 pl-2.5 pr-2 text-[13px] transition-colors ${
        active ? "border-accent font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      <Icon path={ICON_PATHS[icon]} className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workflow = searchParams.get("workflow");
  const { freeModelsOnly, setFreeModelsOnly, hasApiKey, openKeyModal } = useAppSettings();

  const [recent, setRecent] = useState<RunListItem[] | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((json) => setRecent((json.runs ?? []).slice(0, 5)))
      .catch(() => setRecent([]));
  }, [pathname]);

  const onHome = pathname === "/";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-surface px-3 py-4">
      <Link href="/" className="flex items-center gap-2 px-1">
        <LogoMark className="h-6 w-6 text-foreground" />
        <span className="text-[14px] font-semibold tracking-tight">Model Council</span>
      </Link>

      <Link
        href="/"
        onClick={() => window.dispatchEvent(new Event("council:new"))}
        className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Icon path={ICON_PATHS.plus} className="h-3.5 w-3.5" />
        New Council
      </Link>

      <nav className="flex flex-col gap-0.5">
        <NavLink href="/" active={onHome && !workflow} icon="home" label="Home" />
        <NavLink href="/?workflow=chat" active={onHome && workflow === "chat"} icon="chat" label="Chat" />
        <NavLink href="/?workflow=compare" active={onHome && workflow === "compare"} icon="compare" label="Compare" />
        <NavLink href="/?workflow=council" active={onHome && workflow === "council"} icon="council" label="Council" />
        <NavLink href="/models" active={pathname.startsWith("/models")} icon="models" label="Models" />
      </nav>

      <label
        className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-2 text-[12px] transition-colors ${
          freeModelsOnly ? "border-accent bg-accent-soft" : "border-border bg-background hover:border-border-strong"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
              freeModelsOnly ? "bg-accent text-on-accent" : "bg-surface text-muted-2"
            }`}
          >
            <Icon path={ICON_PATHS.bolt} className="h-3.5 w-3.5" filled={freeModelsOnly} />
          </span>
          <span>
            <span className={`block font-medium ${freeModelsOnly ? "text-accent-text" : "text-foreground"}`}>
              Use free models
            </span>
            <span className="block text-[10px] text-muted-2">No paid-model usage</span>
          </span>
        </span>
        <button
          role="switch"
          aria-checked={freeModelsOnly}
          onClick={() => setFreeModelsOnly(!freeModelsOnly)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${freeModelsOnly ? "bg-accent" : "bg-border-strong"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              freeModelsOnly ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      <div className="flex-1">
        <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
          <span className="flex items-center gap-1.5">
            <Icon path={ICON_PATHS.history} /> Recent Work
          </span>
          <Link href="/history" className="normal-case text-accent-text hover:underline">
            View all
          </Link>
        </div>

        {recent === null && <p className="px-1 text-[11px] text-muted-2">Loading…</p>}

        {recent?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-strong px-2.5 py-3 text-center">
            <p className="text-[11px] text-muted">Your work will appear here.</p>
          </div>
        )}

        <div className="space-y-0.5">
          {recent?.map((r) => (
            <Link
              key={r.id}
              href={`/history/${r.id}`}
              className="block truncate rounded-md px-2.5 py-1.5 text-[12px] text-muted hover:bg-background hover:text-foreground"
              title={r.prompt}
            >
              {r.prompt}
            </Link>
          ))}
        </div>
      </div>

      <button
        onClick={openKeyModal}
        className="flex items-center justify-between rounded-lg border border-border px-2.5 py-2 text-[12px] transition-colors hover:border-border-strong"
      >
        <span className="flex items-center gap-1.5">
          <Icon path={ICON_PATHS.key} />
          {hasApiKey ? "OpenRouter key set" : "Add API key"}
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${hasApiKey ? "bg-success" : "bg-danger"}`} />
      </button>
    </aside>
  );
}
