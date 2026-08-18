"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { RunListItem } from "@/lib/repository";
import { useAppSettings } from "@/lib/client/appSettings";
import { Icon, ICON_PATHS } from "@/components/icons";

function MenuLink({
  href,
  active,
  icon,
  label,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: keyof typeof ICON_PATHS;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
        active ? "bg-background font-medium text-foreground" : "text-muted hover:bg-background hover:text-foreground"
      }`}
    >
      <Icon path={ICON_PATHS[icon]} />
      {label}
    </Link>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workflow = searchParams.get("workflow");
  const { freeModelsOnly, setFreeModelsOnly, hasApiKey, openKeyModal } = useAppSettings();

  const [menuOpen, setMenuOpen] = useState(false);
  const [recent, setRecent] = useState<RunListItem[] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    fetch("/api/history")
      .then((r) => r.json())
      .then((json) => setRecent((json.runs ?? []).slice(0, 5)))
      .catch(() => setRecent([]));
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  const onHome = pathname === "/";
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[840px] items-center justify-between px-4">
        <Link
          href="/"
          onClick={() => window.dispatchEvent(new Event("council:new"))}
          className="flex items-center gap-2"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-accent text-[11px] font-bold text-on-accent">
            AI
          </span>
          <span className="font-heading text-[14px] font-bold tracking-tight">Model Council</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
          >
            <Icon path={ICON_PATHS.menu} className="h-4 w-4" />
            {!hasApiKey && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-72 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <nav className="flex flex-col gap-0.5 border-b border-border pb-2">
                <MenuLink href="/" active={onHome && !workflow} icon="home" label="Home" onClick={closeMenu} />
                <MenuLink href="/?workflow=chat" active={onHome && workflow === "chat"} icon="chat" label="Chat" onClick={closeMenu} />
                <MenuLink href="/?workflow=compare" active={onHome && workflow === "compare"} icon="compare" label="Compare" onClick={closeMenu} />
                <MenuLink href="/?workflow=council" active={onHome && workflow === "council"} icon="council" label="Council" onClick={closeMenu} />
                <MenuLink href="/?workflow=auto" active={onHome && workflow === "auto"} icon="auto" label="Auto-route" onClick={closeMenu} />
                <MenuLink href="/models" active={pathname.startsWith("/models")} icon="models" label="Models" onClick={closeMenu} />
              </nav>

              <div className="border-b border-border py-2">
                <label className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px]">
                  <span>
                    <span className="block font-medium">Use free models</span>
                    <span className="block text-[10px] text-muted-2">No paid-model usage</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={freeModelsOnly}
                    onClick={() => setFreeModelsOnly(!freeModelsOnly)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${freeModelsOnly ? "bg-accent" : "bg-border-strong"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        freeModelsOnly ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className="border-b border-border py-2">
                <div className="mb-1 flex items-center justify-between px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                  <span className="flex items-center gap-1.5">
                    <Icon path={ICON_PATHS.history} className="h-3.5 w-3.5" /> Recent Work
                  </span>
                  <Link href="/history" onClick={closeMenu} className="normal-case text-accent hover:underline">
                    View all
                  </Link>
                </div>
                {recent === null && <p className="px-2.5 text-[11px] text-muted-2">Loading…</p>}
                {recent?.length === 0 && <p className="px-2.5 text-[11px] text-muted">Your work will appear here.</p>}
                <div className="space-y-0.5">
                  {recent?.map((r) => (
                    <Link
                      key={r.id}
                      href={`/history/${r.id}`}
                      onClick={closeMenu}
                      className="block truncate rounded-md px-2.5 py-1.5 text-[12px] text-muted hover:bg-background hover:text-foreground"
                      title={r.prompt}
                    >
                      {r.prompt}
                    </Link>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  closeMenu();
                  openKeyModal();
                }}
                className="mt-2 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-background"
              >
                <span className="flex items-center gap-1.5">
                  <Icon path={ICON_PATHS.key} />
                  {hasApiKey ? "OpenRouter key set" : "Add API key"}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${hasApiKey ? "bg-success" : "bg-danger"}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
