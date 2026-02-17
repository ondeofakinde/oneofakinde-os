import { WorldDetailScreen } from "@/features/world/world-detail-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type WorldPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorldPage({ params }: WorldPageProps) {
  const { id } = await params;

  const [session, world, drops] = await Promise.all([
    getOptionalSession(),
    gateway.getWorldById(id),
    gateway.listDropsByWorldId(id)
  ]);

  if (!world) {
    notFound();
  }

  return <WorldDetailScreen world={world} drops={drops} session={session} />;
}
