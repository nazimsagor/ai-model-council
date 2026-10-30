// The logo PNG is a single flat color, so it's used as a mask and painted
// with the theme's text color — it stays legible whatever the background.
export function BrandLogo({
  className = "h-9 w-36",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const mask = "url(/bohumot-logo.png) center / contain no-repeat";
  return (
    <>
      {priority && <link rel="preload" as="image" href="/bohumot-logo.png" />}
      <span
        role="img"
        aria-label="Bohumot AI"
        style={{ mask, WebkitMask: mask, backgroundColor: "var(--foreground)" }}
        className={`block ${className}`}
      />
    </>
  );
}
