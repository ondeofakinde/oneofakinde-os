import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";
import { DEFAULT_TOWNHALL_FEED_PAGE_SIZE, paginateTownhallFeed } from "@/lib/townhall/feed-pagination";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";

type TownhallViewer = {
  accountId: string;
  handle: string;
};

export async function loadTownhallFeedContext() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    drops.map((drop) => drop.id)
  );
  const rankedDrops = rankDropsForTownhall(drops, {
    telemetryByDropId
  });
  const initialPage = paginateTownhallFeed(rankedDrops, {
    pageSize: DEFAULT_TOWNHALL_FEED_PAGE_SIZE
  });
  const initialDropIds = initialPage.drops.map((drop) => drop.id);

  if (!session) {
    const social = await commerceBffService.getTownhallSocialSnapshot(null, initialDropIds);
    return {
      viewer: null as TownhallViewer | null,
      drops: initialPage.drops,
      ownedDropIds: [] as string[],
      socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>,
      nextCursor: initialPage.nextCursor,
      hasMore: initialPage.hasMore,
      pageSize: initialPage.pageSize
    };
  }

  const [collection, social] = await Promise.all([
    gateway.getMyCollection(session.accountId),
    commerceBffService.getTownhallSocialSnapshot(session.accountId, initialDropIds)
  ]);

  return {
    viewer: {
      accountId: session.accountId,
      handle: session.handle
    } as TownhallViewer,
    drops: initialPage.drops,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id),
    socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>,
    nextCursor: initialPage.nextCursor,
    hasMore: initialPage.hasMore,
    pageSize: initialPage.pageSize
  };
}
