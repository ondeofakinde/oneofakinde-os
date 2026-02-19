import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallWatchPage() {
  const { session, drops, ownedDropIds } = await loadTownhallFeedContext();
  return <TownhallFeedScreen mode="watch" session={session} drops={drops} ownedDropIds={ownedDropIds} />;
}
