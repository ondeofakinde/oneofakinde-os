import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

type TownhallViewer = {
  accountId: string;
  handle: string;
};

export async function loadTownhallFeedContext() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);

  if (!session) {
    return {
      viewer: null as TownhallViewer | null,
      drops,
      ownedDropIds: [] as string[]
    };
  }

  const collection = await gateway.getMyCollection(session.accountId);

  return {
    viewer: {
      accountId: session.accountId,
      handle: session.handle
    } as TownhallViewer,
    drops,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id)
  };
}
