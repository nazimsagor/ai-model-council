import Link from "next/link";

export function SignInPrompt({ next, message }: { next: string; message: string }) {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
      <p className="mb-4 text-[13px] text-muted">{message}</p>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Sign in
      </Link>
    </div>
  );
}
