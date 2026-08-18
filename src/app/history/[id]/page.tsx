import { notFound } from "next/navigation";
import { getRun } from "@/lib/repository";
import { getVisitorId } from "@/lib/session";
import { RunReport } from "@/components/RunReport";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await getVisitorId();
  const run = await getRun(id, visitorId);
  if (!run) notFound();
  return <RunReport run={run} />;
}
