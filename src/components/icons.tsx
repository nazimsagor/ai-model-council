export function Icon({
  path,
  className = "h-4 w-4",
  filled = false,
}: {
  path: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`shrink-0 ${className}`} aria-hidden>
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export const ICON_PATHS = {
  chevronDown: "M5 7.5 10 12.5 15 7.5",
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1V9.5Z",
  chat: "M3 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8l-4 3v-3H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
  compare: "M4 3v14M16 3v14M4 6h5v11H4V6ZM11 6h5v8h-5V6Z",
  council: "M6 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17c0-2.8 2-5 4.5-5S11 14.2 11 17M9 17c0-2.5 1.8-4.5 5-4.5s5 2 5 4.5",
  models: "M10 2 3 6l7 4 7-4-7-4ZM3 10l7 4 7-4M3 14l7 4 7-4",
  history: "M10 5v5l3.5 2M17 10a7 7 0 1 1-2-4.9M17 3v4h-4",
  key: "M8 12a4 4 0 1 1 3.995-4.2M8 12a4 4 0 0 0 3.995-4.2M8 12l8-8m-2.5 2.5L15 8m-3-3 1.5 1.5",
  sparkle: "M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l1.8 1.8M12.7 12.7l1.8 1.8M14.5 5.5l-1.8 1.8M7.3 12.7l-1.8 1.8",
  check: "M4 10.5 8 14.5 16 6",
  arrowUp: "M10 15V5M5 9.5 10 5l5 4.5",
  arrowRight: "M4 10h12M11 5l5 5-5 5",
  trophy: "M6 3h8v4a4 4 0 0 1-8 0V3ZM4 4H2v2a3 3 0 0 0 3 3M16 4h2v2a3 3 0 0 0-3 3M8 13v2a2 2 0 0 0 4 0v-2M7 17h6",
  warning: "M10 3 2 17h16L10 3ZM10 8.5v3.5M10 14.5v.01",
  close: "M5 5l10 10M15 5 5 15",
  menu: "M3 5h14M3 10h14M3 15h14",
  plus: "M10 4v12M4 10h12",
  star: "M10 2.5 12.5 7.6 18 8.4 14 12.3 15 17.8 10 15.1 5 17.8 6 12.3 2 8.4 7.5 7.6 10 2.5Z",
  logout: "M8 4H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1H8M13 14l4-4-4-4M17 10H7.5",
  globe: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM3 10h14M10 3c1.8 1.9 2.8 4.4 2.8 7s-1 5.1-2.8 7c-1.8-1.9-2.8-4.4-2.8-7s1-5.1 2.8-7Z",
  bolt: "M11 2 4 11.5h5L9 18l7-9.5h-5L11 2Z",
} as const;
