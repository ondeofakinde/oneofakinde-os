import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallLivePage() {
  const { session, drops, ownedDropIds } = await loadTownhallFeedContext();
  return <TownhallFeedScreen mode="live" session={session} drops={drops} ownedDropIds={ownedDropIds} />;
}
