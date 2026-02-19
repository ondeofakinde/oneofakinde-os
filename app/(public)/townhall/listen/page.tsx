import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallListenPage() {
  const { viewer, drops, ownedDropIds } = await loadTownhallFeedContext();
  return <TownhallFeedScreen mode="listen" viewer={viewer} drops={drops} ownedDropIds={ownedDropIds} />;
}
