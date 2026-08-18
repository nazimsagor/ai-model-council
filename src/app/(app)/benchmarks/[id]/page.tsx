import { BenchmarkDetail } from "@/components/BenchmarkDetail";

export default async function BenchmarkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BenchmarkDetail benchmarkId={id} />;
}
