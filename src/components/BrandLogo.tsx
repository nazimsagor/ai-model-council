import Image from "next/image";

export function BrandLogo({
  className = "h-9 w-36",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/bohumot-logo.png"
      alt="Bohumot AI"
      width={1200}
      height={342}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={`object-contain ${className}`}
    />
  );
}
