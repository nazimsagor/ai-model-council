import { getCurrentUserId } from "@/lib/supabase/authServer";
import { BenchmarksList } from "@/components/BenchmarksList";
import { SignInPrompt } from "@/components/SignInPrompt";

export default async function BenchmarksPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return <SignInPrompt next="/benchmarks" message="Sign in to create and run benchmarks." />;
  }
  return <BenchmarksList />;
}
