import { notFound, redirect } from "next/navigation";
import { getRun, listFollowUps } from "@/lib/repository";
import { getRunOwner } from "@/lib/runOwner";
import { SIGN_IN_REQUIRED } from "@/lib/authMode";
import { RunReport } from "@/components/RunReport";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getRunOwner();
  if (!owner) {
    if (SIGN_IN_REQUIRED) redirect(`/login?next=${encodeURIComponent(`/history/${id}`)}`);
    notFound();
  }
  const run = await getRun(id, owner);
  if (!run) notFound();
  const followUps = run.workflow === "chat" ? await listFollowUps(id, owner) : [];
  return <RunReport run={run} followUps={followUps} />;
}
