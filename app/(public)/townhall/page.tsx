import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "./load-feed-context";

export default async function TownhallPage() {
  const { viewer, drops, ownedDropIds } = await loadTownhallFeedContext();
  return <TownhallFeedScreen mode="watch" viewer={viewer} drops={drops} ownedDropIds={ownedDropIds} isTownhallHome />;
}
