import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const lane = parseCollectMarketLane(url.searchParams.get("lane"));
  const inventory = await commerceBffService.getCollectInventory(guard.session.accountId, lane);

  return ok({
    lane: inventory.lane,
    listings: inventory.listings
  });
}
