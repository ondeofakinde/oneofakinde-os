import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import {
  buildCollectInventorySnapshot,
  listCollectInventoryByLane,
  parseCollectMarketLane
} from "@/lib/collect/market-lanes";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const lane = parseCollectMarketLane(url.searchParams.get("lane"));
  const drops = await commerceBffService.listDrops();
  const snapshot = buildCollectInventorySnapshot(drops);
  const listings = listCollectInventoryByLane(snapshot.listings, lane);

  return ok({
    lane,
    listings
  });
}
