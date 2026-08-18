import { notFound } from "next/navigation";
import { getRun } from "@/lib/repository";
import { getCurrentUserId } from "@/lib/supabase/authServer";
import { RunReport } from "@/components/RunReport";
import { SignInPrompt } from "@/components/SignInPrompt";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    return <SignInPrompt next={`/history/${id}`} message="Sign in to view this council run." />;
  }
  const run = await getRun(id, userId);
  if (!run) notFound();
  return <RunReport run={run} />;
}
