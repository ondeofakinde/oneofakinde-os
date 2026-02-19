import { CollectMarketplaceScreen } from "@/features/collect/collect-marketplace-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

export default async function CollectPage() {
  const session = await requireSession("/collect");
  const drops = await gateway.listDrops();

  return <CollectMarketplaceScreen session={session} drops={drops} />;
}
