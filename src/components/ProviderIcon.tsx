"use client";

import { useState } from "react";
import { providerColor, providerDomain, providerInitials } from "@/lib/client/providerColors";

/** Small original abstract glyphs per provider — not copies of their
 *  trademarked logos, just distinct enough shapes/colors to recognize at a
 *  glance in a dense model grid. Providers without a curated glyph fall
 *  back to colored initials. */
function Glyph({ provider, color }: { provider: string; color: string }) {
  const p = provider.toLowerCase();
  const common = { viewBox: "0 0 20 20", className: "h-4 w-4" } as const;

  switch (p) {
    case "openai":
      return (
        <svg {...common} fill="none">
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = 10 + Math.cos(rad) * 5.5;
            const cy = 10 + Math.sin(rad) * 5.5;
            return <circle key={deg} cx={cx} cy={cy} r="1.7" fill={color} />;
          })}
        </svg>
      );
    case "anthropic":
      return (
        <svg {...common} stroke={color} strokeWidth="1.6" strokeLinecap="round">
          <path d="M10 3v14M4.5 6l11 8M15.5 6l-11 8" />
        </svg>
      );
    case "google":
      return (
        <svg {...common}>
          <circle cx="6.5" cy="6.5" r="2.6" fill="#4285F4" />
          <circle cx="13.5" cy="6.5" r="2.6" fill="#EA4335" />
          <circle cx="6.5" cy="13.5" r="2.6" fill="#FBBC05" />
          <circle cx="13.5" cy="13.5" r="2.6" fill="#34A853" />
        </svg>
      );
    case "meta":
    case "meta-llama":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.6">
          <path d="M4 13c0-4 2-7 4.5-7S12 9 12 13s2 4 4 4 4-3 4-7-2-7-4.5-7S13 6 13 10" />
        </svg>
      );
    case "mistralai":
      return (
        <svg {...common}>
          <rect x="3" y="12.5" width="14" height="2.2" rx="1" fill={color} opacity="0.55" />
          <rect x="4.5" y="8.5" width="11" height="2.2" rx="1" fill={color} opacity="0.78" />
          <rect x="6" y="4.5" width="8" height="2.2" rx="1" fill={color} />
        </svg>
      );
    case "nvidia":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5">
          <path d="M2 10c2.5-3.5 5.3-5.2 8-5.2s5.5 1.7 8 5.2c-2.5 3.5-5.3 5.2-8 5.2S4.5 13.5 2 10Z" />
          <circle cx="10" cy="10" r="2.1" fill={color} stroke="none" />
        </svg>
      );
    case "cohere":
      return (
        <svg {...common}>
          <circle cx="6" cy="7.5" r="2.6" fill="#39B54A" />
          <circle cx="14" cy="7" r="2.2" fill="#D6249F" />
          <circle cx="8.5" cy="13.5" r="2.9" fill="#171717" />
        </svg>
      );
    case "deepseek":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
          <path d="M2.5 8c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0M2.5 12.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" />
        </svg>
      );
    case "qwen":
      return <svg {...common}>{svgPath("M10 2.5 17 10 10 17.5 3 10Z", color)}</svg>;
    case "moonshotai":
      return <svg {...common}>{svgPath("M12.5 3.5a7 7 0 1 0 4 12.5A8.5 8.5 0 0 1 12.5 3.5Z", color)}</svg>;
    case "microsoft":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="6" height="6" fill="#F25022" />
          <rect x="11" y="3" width="6" height="6" fill="#7FBA00" />
          <rect x="3" y="11" width="6" height="6" fill="#00A4EF" />
          <rect x="11" y="11" width="6" height="6" fill="#FFB900" />
        </svg>
      );
    case "amazon":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
          <path d="M4 12c3 2.5 9 2.5 12 0" />
          <path d="M14 10.5 16.5 12l-1 2.5" />
        </svg>
      );
    case "x-ai":
    case "xai":
      return (
        <svg {...common} stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 5l10 10M15 5 5 15" />
        </svg>
      );
    case "perplexity":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.5">
          <circle cx="10" cy="10" r="6.5" />
          <circle cx="10" cy="10" r="1.6" fill={color} stroke="none" />
          <path d="M10 3.5v3M16.5 10h-3M10 16.5v-3M3.5 10h3" />
        </svg>
      );
    default:
      return null;
  }
}

function svgPath(d: string, color: string) {
  return <path d={d} fill={color} />;
}

export function ProviderIcon({ provider, className = "h-8 w-8" }: { provider: string; className?: string }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const color = providerColor(provider);
  const domain = providerDomain(provider);

  if (domain && !logoFailed) {
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external logo, not an optimizable local asset */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={`${provider} logo`}
          className="h-full w-full object-contain"
          onError={() => setLogoFailed(true)}
        />
      </span>
    );
  }

  const glyph = Glyph({ provider, color });
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg ${className}`}
      style={{ backgroundColor: `${color}22` }}
    >
      {glyph ?? <span className="text-[10px] font-bold" style={{ color }}>{providerInitials(provider)}</span>}
    </span>
  );
}
