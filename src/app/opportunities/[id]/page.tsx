import { OpportunityDetailScreen } from "@/features/opportunities";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetailScreen id={id} />;
}
