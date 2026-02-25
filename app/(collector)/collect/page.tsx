import { CollectMarketplaceScreen } from "@/features/collect/collect-marketplace-screen";
import {
  buildCollectInventorySnapshot,
  parseCollectMarketLane
} from "@/lib/collect/market-lanes";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

type CollectPageProps = {
  searchParams: Promise<{ lane?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function CollectPage({ searchParams }: CollectPageProps) {
  const session = await requireSession("/collect");
  const drops = await gateway.listDrops();
  const inventory = buildCollectInventorySnapshot(drops);
  const resolvedParams = await searchParams;
  const initialLane = parseCollectMarketLane(firstParam(resolvedParams.lane));

  return (
    <CollectMarketplaceScreen
      session={session}
      listings={inventory.listings}
      initialLane={initialLane}
    />
  );
}
