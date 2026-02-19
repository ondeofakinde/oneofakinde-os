import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";

type TownhallViewer = {
  accountId: string;
  handle: string;
};

export async function loadTownhallFeedContext() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  const rankedDrops = rankDropsForTownhall(drops);

  if (!session) {
    return {
      viewer: null as TownhallViewer | null,
      drops: rankedDrops,
      ownedDropIds: [] as string[]
    };
  }

  const collection = await gateway.getMyCollection(session.accountId);

  return {
    viewer: {
      accountId: session.accountId,
      handle: session.handle
    } as TownhallViewer,
    drops: rankedDrops,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id)
  };
}
