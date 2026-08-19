import { notFound, redirect } from "next/navigation";
import { getRun } from "@/lib/repository";
import { getCurrentUser } from "@/lib/subscription";
import { RunReport } from "@/components/RunReport";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/history/${id}`)}`);
  const run = await getRun(id, user.id);
  if (!run) notFound();
  return <RunReport run={run} />;
}
