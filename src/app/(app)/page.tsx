import { Suspense } from "react";
import { CouncilDashboard } from "@/components/CouncilDashboard";
import { getCurrentUserId } from "@/lib/supabase/authServer";

export default async function Home() {
  const userId = await getCurrentUserId();
  return (
    <Suspense fallback={null}>
      <CouncilDashboard hasSession={Boolean(userId)} />
    </Suspense>
  );
}
