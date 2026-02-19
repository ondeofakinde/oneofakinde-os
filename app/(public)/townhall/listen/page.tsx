import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallListenPage() {
  const { session, drops, ownedDropIds } = await loadTownhallFeedContext();
  return <TownhallFeedScreen mode="listen" session={session} drops={drops} ownedDropIds={ownedDropIds} />;
}
