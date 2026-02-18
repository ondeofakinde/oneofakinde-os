import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function TownhallListenPage() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  return <TownhallFeedScreen mode="listen" session={session} drops={drops} />;
}
