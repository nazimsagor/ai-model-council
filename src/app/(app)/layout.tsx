import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/supabase/authServer";
import { signOutAction } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-full">
      <Suspense fallback={<div className="w-60 shrink-0 border-r border-border bg-surface" />}>
        <Sidebar userEmail={user?.email ?? null} onSignOut={signOutAction} />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
