import { CollectMarketplaceScreen } from "@/features/collect/collect-marketplace-screen";
import { commerceBffService } from "@/lib/bff/service";
import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
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
  const resolvedParams = await searchParams;
  const initialLane = parseCollectMarketLane(firstParam(resolvedParams.lane));
  const [inventory, memberships, liveSessions] = await Promise.all([
    commerceBffService.getCollectInventory(session.accountId, initialLane),
    commerceBffService.listMembershipEntitlements(session.accountId),
    commerceBffService.listCollectLiveSessions(session.accountId)
  ]);

  return (
    <CollectMarketplaceScreen
      session={session}
      listings={inventory.listings}
      initialLane={inventory.lane}
      memberships={memberships}
      liveSessions={liveSessions}
    />
  );
}
