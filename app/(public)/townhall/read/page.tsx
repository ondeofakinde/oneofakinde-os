import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallReadPage() {
  const { session, drops, ownedDropIds } = await loadTownhallFeedContext();
  return <TownhallFeedScreen mode="read" session={session} drops={drops} ownedDropIds={ownedDropIds} />;
}
