import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import {
  GET as getCollectDropOffersRoute,
  POST as postCollectDropOffersRoute
} from "../../app/api/v1/collect/offers/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collect-auction-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: auction bids can be awarded and settled with public execution price", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const bidderA = await commerceBffService.createSession({
    email: `auction-bidder-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const bidderB = await commerceBffService.createSession({
    email: `auction-bidder-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=auction", {
      headers: {
        "x-ook-session-token": bidderA.sessionToken
      }
    })
  );
  assert.equal(inventoryResponse.status, 200);
  const inventoryPayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const auctionDropId = inventoryPayload.listings[0]?.drop.id;
  assert.ok(auctionDropId, "expected auction lane drop");

  const submitA = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderA.sessionToken
      },
      body: JSON.stringify({
        action: "submit_auction_bid",
        amountUsd: 14.1
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(submitA.status, 201);

  const submitB = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderB.sessionToken
      },
      body: JSON.stringify({
        action: "submit_auction_bid",
        amountUsd: 15.33
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(submitB.status, 201);

  const awardResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "award_highest_auction_bid"
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(awardResponse.status, 200);
  const awardPayload = await parseJson<{
    offers: Array<{ id: string; amountUsd: number; state: string }>;
  }>(awardResponse);
  const acceptedOffer = awardPayload.offers.find((offer) => offer.state === "accepted");
  assert.ok(acceptedOffer, "expected accepted auction offer");
  assert.equal(acceptedOffer?.amountUsd, 15.33);

  const settleResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "settle_awarded_auction_bid",
        executionPriceUsd: 14.95
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(settleResponse.status, 200);

  const publicResponse = await getCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(publicResponse.status, 200);
  const publicPayload = await parseJson<{
    offers: Array<{
      id: string;
      state: string;
      executionVisibility: string | null;
      executionPriceUsd: number | null;
    }>;
  }>(publicResponse);
  const settledOffer = publicPayload.offers.find((offer) => offer.id === acceptedOffer?.id);
  assert.equal(settledOffer?.state, "settled");
  assert.equal(settledOffer?.executionVisibility, "public");
  assert.equal(settledOffer?.executionPriceUsd, 14.95);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    collectOffers: Array<{ id: string; state: string; executionVisibility: string; executionPriceUsd: number | null }>;
  };
  const persisted = raw.collectOffers.find((offer) => offer.id === acceptedOffer?.id);
  assert.equal(persisted?.state, "settled");
  assert.equal(persisted?.executionVisibility, "public");
  assert.equal(persisted?.executionPriceUsd, 14.95);
});

test("proof: auction fallback expires current winner and awards next bid", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const bidderA = await commerceBffService.createSession({
    email: `auction-fallback-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const bidderB = await commerceBffService.createSession({
    email: `auction-fallback-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=auction", {
      headers: {
        "x-ook-session-token": bidderA.sessionToken
      }
    })
  );
  assert.equal(inventoryResponse.status, 200);
  const inventoryPayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const auctionDropId = inventoryPayload.listings[0]?.drop.id;
  assert.ok(auctionDropId, "expected auction lane drop");

  const submitA = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderA.sessionToken
      },
      body: JSON.stringify({
        action: "submit_auction_bid",
        amountUsd: 18.44
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(submitA.status, 201);

  const submitB = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderB.sessionToken
      },
      body: JSON.stringify({
        action: "submit_auction_bid",
        amountUsd: 17.75
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(submitB.status, 201);

  const awardResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "award_highest_auction_bid"
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(awardResponse.status, 200);

  const fallbackResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "fallback_awarded_auction_bid"
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(fallbackResponse.status, 200);
  const fallbackPayload = await parseJson<{
    offers: Array<{ amountUsd: number; state: string }>;
  }>(fallbackResponse);

  const expiredWinner = fallbackPayload.offers.find(
    (offer) => offer.state === "expired" && offer.amountUsd === 18.44
  );
  const acceptedFallback = fallbackPayload.offers.find(
    (offer) => offer.state === "accepted" && offer.amountUsd === 17.75
  );

  assert.ok(expiredWinner, "expected previous winner to expire during fallback");
  assert.ok(acceptedFallback, "expected next highest bid to be awarded during fallback");
});
