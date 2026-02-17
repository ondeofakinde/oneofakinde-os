import { WorldDetailScreen } from "@/features/world/world-detail-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type WorldPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorldPage({ params }: WorldPageProps) {
  const { id } = await params;

  const [session, world, drops] = await Promise.all([
    getOptionalSession(),
    commerceGateway.getWorldById(id),
    commerceGateway.listDropsByWorldId(id)
  ]);

  if (!world) {
    notFound();
  }

  return <WorldDetailScreen world={world} drops={drops} session={session} />;
}
