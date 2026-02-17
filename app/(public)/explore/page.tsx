import { ExploreScreen } from "@/features/explore/explore-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { getOptionalSession } from "@/lib/server/session";

// drops
export default async function ExplorePage() {
  const [session, drops, worlds] = await Promise.all([
    getOptionalSession(),
    commerceGateway.listDrops(),
    commerceGateway.listWorlds()
  ]);

  return <ExploreScreen session={session} drops={drops} worlds={worlds} />;
}
