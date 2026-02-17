import { DropDetailScreen } from "@/features/drops/drop-detail-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropDetailPage({ params }: DropDetailPageProps) {
  const { id } = await params;

  const [drop, session] = await Promise.all([
    gateway.getDropById(id),
    getOptionalSession()
  ]);

  if (!drop) {
    notFound();
  }

  return <DropDetailScreen drop={drop} session={session} />;
}
