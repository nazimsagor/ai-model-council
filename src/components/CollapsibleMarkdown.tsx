"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders markdown collapsed behind a fade + toggle once it exceeds
 *  `maxHeight` — long model/verdict answers otherwise dominate the page.
 *  Short content renders unchanged (no toggle appears) since overflow is
 *  measured against the actual rendered height, not content length. */
export function CollapsibleMarkdown({
  content,
  maxHeight = 420,
  className = "",
  fadeClassName = "from-surface to-transparent",
}: {
  content: string;
  maxHeight?: number;
  className?: string;
  fadeClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExpanded(false);
      const el = contentRef.current;
      setOverflowing(el ? el.scrollHeight > maxHeight + 8 : false);
    }, 0);
    return () => clearTimeout(timer);
  }, [content, maxHeight]);

  return (
    <div>
      <div className="relative">
        <div
          ref={contentRef}
          style={!expanded && overflowing ? { maxHeight, overflow: "hidden" } : undefined}
          className={className}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {!expanded && overflowing && (
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${fadeClassName}`} />
        )}
      </div>
      {overflowing && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[12px] font-semibold text-accent-text hover:underline"
        >
          {expanded ? "Show less" : "Show full answer"}
        </button>
      )}
    </div>
  );
}
