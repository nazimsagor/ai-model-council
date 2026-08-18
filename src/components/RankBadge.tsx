import { Icon, ICON_PATHS } from "@/components/icons";

const RANK_STYLES = [
  { bg: "bg-accent", text: "text-on-accent", label: "Top response" },
  { bg: "bg-muted-2", text: "text-on-accent", label: "Runner-up" },
  { bg: "bg-border-strong", text: "text-foreground", label: "Third place" },
];

/** Accessible rank indicator for the top 3 results — a trophy for #1, numbered
 *  badges for #2/#3 instead of medal emoji (screen-reader friendly, theme-aware). */
export function RankBadge({ rank }: { rank: 0 | 1 | 2 }) {
  const style = RANK_STYLES[rank];
  return (
    <span
      role="img"
      aria-label={style.label}
      title={style.label}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${style.bg} ${style.text}`}
    >
      {rank === 0 ? <Icon path={ICON_PATHS.trophy} className="h-2.5 w-2.5" /> : rank + 1}
    </span>
  );
}
