import { Suspense } from "react";
import { CouncilDashboard } from "@/components/CouncilDashboard";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <CouncilDashboard />
    </Suspense>
  );
}
