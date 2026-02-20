import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";

type TownhallViewer = {
  accountId: string;
  handle: string;
};

export async function loadTownhallFeedContext() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  const rankedDrops = rankDropsForTownhall(drops);
  const dropIds = rankedDrops.map((drop) => drop.id);

  if (!session) {
    const social = await commerceBffService.getTownhallSocialSnapshot(null, dropIds);
    return {
      viewer: null as TownhallViewer | null,
      drops: rankedDrops,
      ownedDropIds: [] as string[],
      socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>
    };
  }

  const [collection, social] = await Promise.all([
    gateway.getMyCollection(session.accountId),
    commerceBffService.getTownhallSocialSnapshot(session.accountId, dropIds)
  ]);

  return {
    viewer: {
      accountId: session.accountId,
      handle: session.handle
    } as TownhallViewer,
    drops: rankedDrops,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id),
    socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>
  };
}
