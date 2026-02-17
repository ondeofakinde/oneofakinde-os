import { WorldDropsScreen } from "@/features/world/world-drops-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type WorldDropsPageProps = {
  params: Promise<{ id: string }>;
};

// drops
export default async function WorldDropsPage({ params }: WorldDropsPageProps) {
  const { id } = await params;

  const [session, world, drops] = await Promise.all([
    getOptionalSession(),
    gateway.getWorldById(id),
    gateway.listDropsByWorldId(id)
  ]);

  if (!world) {
    notFound();
  }

  return <WorldDropsScreen world={world} drops={drops} session={session} />;
}
