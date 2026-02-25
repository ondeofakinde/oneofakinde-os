import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallWatchPage() {
  const { viewer, drops, ownedDropIds, socialByDropId, nextCursor, hasMore, pageSize } =
    await loadTownhallFeedContext();
  return (
    <TownhallFeedScreen
      mode="watch"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
    />
  );
}
