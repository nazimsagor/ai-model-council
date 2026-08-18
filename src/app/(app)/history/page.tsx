import { getCurrentUserId } from "@/lib/supabase/authServer";
import { HistoryList } from "@/components/HistoryList";
import { SignInPrompt } from "@/components/SignInPrompt";

export default async function HistoryPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return <SignInPrompt next="/history" message="Sign in to see your council run history." />;
  }
  return <HistoryList />;
}
