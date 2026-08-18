/**
 * Original abstract mark: several minds converging into one decision.
 * Three small nodes (independent models) resolve into one larger node
 * (the council). Not a robot, not a slash mark — a council diagram.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 7.5 12 16M12 5.5 12 16M18 7.5 12 16"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="6" cy="7.5" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="12" cy="5.5" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="18" cy="7.5" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="12" cy="17.5" r="3.2" className="fill-accent" />
    </svg>
  );
}
