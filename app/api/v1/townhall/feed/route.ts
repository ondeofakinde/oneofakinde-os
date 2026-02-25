import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import {
  paginateTownhallFeed,
  parseTownhallFeedPageSize
} from "@/lib/townhall/feed-pagination";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const pageSize = parseTownhallFeedPageSize(url.searchParams.get("limit"));

  const [session, drops] = await Promise.all([getRequestSession(request), gateway.listDrops()]);
  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    drops.map((drop) => drop.id)
  );
  const rankedDrops = rankDropsForTownhall(drops, {
    telemetryByDropId
  });

  let page;
  try {
    page = paginateTownhallFeed(rankedDrops, {
      cursor,
      pageSize
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "invalid cursor");
  }

  const pageDropIds = page.drops.map((drop) => drop.id);
  const social = await commerceBffService.getTownhallSocialSnapshot(
    session?.accountId ?? null,
    pageDropIds
  );

  const collection = session ? await gateway.getMyCollection(session.accountId) : null;
  return ok({
    viewer: session
      ? {
          accountId: session.accountId,
          handle: session.handle
        }
      : null,
    feed: page,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id),
    socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>
  });
}
