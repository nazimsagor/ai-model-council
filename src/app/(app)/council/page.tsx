import { Suspense } from "react";
import { CouncilDashboard } from "@/components/CouncilDashboard";

export default function CouncilPage() {
  return (
    <Suspense fallback={null}>
      <CouncilDashboard />
    </Suspense>
  );
}
