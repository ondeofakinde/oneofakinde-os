import { getRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { buildCollectInventorySnapshot } from "@/lib/collect/market-lanes";
import { commerceBffService } from "@/lib/bff/service";

type CollectDropOffersRouteParams = {
  drop_id: string;
};

export async function GET(
  request: Request,
  context: RouteContext<CollectDropOffersRouteParams>
) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  const [session, drops] = await Promise.all([
    getRequestSession(request),
    commerceBffService.listDrops()
  ]);
  const snapshot = buildCollectInventorySnapshot(drops);
  const listing = snapshot.listings.find((entry) => entry.drop.id === dropId) ?? null;
  const offers = snapshot.offersByDropId[dropId] ?? [];

  return ok({
    viewer: session
      ? {
          accountId: session.accountId,
          handle: session.handle
        }
      : null,
    dropId,
    listing,
    offers
  });
}
