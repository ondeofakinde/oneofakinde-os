import { MediaHubScreen } from "@/features/hubs/media-hub-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function TownhallReadPage() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  return <MediaHubScreen mode="read" session={session} drops={drops} />;
}
