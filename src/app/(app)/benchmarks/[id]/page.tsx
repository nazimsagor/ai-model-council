import { getCurrentUserId } from "@/lib/supabase/authServer";
import { BenchmarkDetail } from "@/components/BenchmarkDetail";
import { SignInPrompt } from "@/components/SignInPrompt";

export default async function BenchmarkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    return <SignInPrompt next={`/benchmarks/${id}`} message="Sign in to view this benchmark." />;
  }
  return <BenchmarkDetail benchmarkId={id} />;
}
