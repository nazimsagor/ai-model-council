import { Suspense } from "react";
import { CouncilDashboard } from "@/components/CouncilDashboard";

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CouncilDashboard />
    </Suspense>
  );
}
