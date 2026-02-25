import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import type { TownhallOrderMode } from "@/lib/townhall/order";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";

type TownhallViewer = {
  accountId: string;
  handle: string;
};

type TownhallFeedContextOptions = {
  orderMode?: TownhallOrderMode;
};

export async function loadTownhallFeedContext(options: TownhallFeedContextOptions = {}) {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    drops.map((drop) => drop.id)
  );
  const rankedDrops = rankDropsForTownhall(drops, {
    orderMode: options.orderMode,
    telemetryByDropId
  });
  const rankedDropIds = rankedDrops.map((drop) => drop.id);

  if (!session) {
    const social = await commerceBffService.getTownhallSocialSnapshot(null, rankedDropIds);
    return {
      viewer: null as TownhallViewer | null,
      drops: rankedDrops,
      ownedDropIds: [] as string[],
      socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>
    };
  }

  const [collection, social] = await Promise.all([
    gateway.getMyCollection(session.accountId),
    commerceBffService.getTownhallSocialSnapshot(session.accountId, rankedDropIds)
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
