import { Suspense } from "react";
import { CouncilDashboard } from "@/components/CouncilDashboard";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <CouncilDashboard />
    </Suspense>
  );
}
