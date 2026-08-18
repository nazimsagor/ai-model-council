import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Suspense fallback={<div className="w-60 shrink-0 border-r border-border bg-surface" />}>
        <Sidebar />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
