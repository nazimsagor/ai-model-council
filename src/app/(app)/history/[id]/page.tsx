import { notFound } from "next/navigation";
import { getRun } from "@/lib/repository";
import { requireUserId } from "@/lib/session";
import { RunReport } from "@/components/RunReport";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const run = await getRun(id, userId);
  if (!run) notFound();
  return <RunReport run={run} />;
}
