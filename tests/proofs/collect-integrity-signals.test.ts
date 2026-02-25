import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectIntegrityRoute } from "../../app/api/v1/collect/integrity/route";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { POST as postCollectDropOffersRoute } from "../../app/api/v1/collect/offers/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collect-integrity-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: collect integrity route is creator-only and includes invalid amount enforcement signals", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `collect-integrity-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(inventoryResponse.status, 200);
  const inventoryPayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const resaleDropId = inventoryPayload.listings[0]?.drop.id;
  assert.ok(resaleDropId, "expected resale lane drop");

  const invalidAmountResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 0
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(invalidAmountResponse.status, 400);

  const collectorView = await getCollectIntegrityRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/integrity", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(collectorView.status, 403);

  const creatorView = await getCollectIntegrityRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/integrity?dropId=${encodeURIComponent(resaleDropId)}`, {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(creatorView.status, 200);
  const creatorPayload = await parseJson<{
    signalCounts: Record<string, number>;
    recentSignals: Array<{ signalType: string }>;
  }>(creatorView);
  assert.ok((creatorPayload.signalCounts.invalid_amount_rejected ?? 0) >= 1);
  assert.ok(
    creatorPayload.recentSignals.some((signal) => signal.signalType === "invalid_amount_rejected")
  );
});

test("proof: collect integrity snapshot captures cross-drop and reaward enforcement signals", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const bidderA = await commerceBffService.createSession({
    email: `collect-integrity-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const bidderB = await commerceBffService.createSession({
    email: `collect-integrity-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const resaleLaneResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: {
        "x-ook-session-token": bidderA.sessionToken
      }
    })
  );
  assert.equal(resaleLaneResponse.status, 200);
  const resaleLanePayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(resaleLaneResponse);
  const resaleDropId = resaleLanePayload.listings[0]?.drop.id;
  assert.ok(resaleDropId, "expected resale lane drop");

  const otherDropId = (await commerceBffService.listDrops()).find((drop) => drop.id !== resaleDropId)?.id;
  assert.ok(otherDropId, "expected alternate drop id");

  const submitResale = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderA.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 9.75
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(submitResale.status, 201);
  const submitResalePayload = await parseJson<{
    offers: Array<{ id: string }>;
  }>(submitResale);
  const resaleOfferId = submitResalePayload.offers[0]?.id;
  assert.ok(resaleOfferId, "expected resale offer id");

  const crossDropTransition = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${otherDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "accept_offer",
        offerId: resaleOfferId
      })
    }),
    withRouteParams({ drop_id: otherDropId! })
  );
  assert.equal(crossDropTransition.status, 404);

  const auctionLaneResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=auction", {
      headers: {
        "x-ook-session-token": bidderA.sessionToken
      }
    })
  );
  assert.equal(auctionLaneResponse.status, 200);
  const auctionLanePayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(auctionLaneResponse);
  const auctionDropId = auctionLanePayload.listings[0]?.drop.id;
  assert.ok(auctionDropId, "expected auction lane drop");

  const submitAuctionA = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderA.sessionToken
      },
      body: JSON.stringify({
        action: "submit_auction_bid",
        amountUsd: 15.5
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(submitAuctionA.status, 201);

  const submitAuctionB = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${auctionDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": bidderB.sessionToken
      },
      body: JSON.stringify({
        action: "submit_auction_bid",
        amountUsd: 16.25
      })
    }),
    withRouteParams({ drop_id: auctionDropId })
  );
  assert.equal(submitAuctionB.status, 201);

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

  const reawardResponse = await postCollectDropOffersRoute(
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
  assert.equal(reawardResponse.status, 400);

  const integrityResponse = await getCollectIntegrityRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/integrity?limit=50", {
      headers: {
        "x-ook-session-token": creator.sessionToken
      }
    })
  );
  assert.equal(integrityResponse.status, 200);
  const integrityPayload = await parseJson<{
    signalCounts: Record<string, number>;
    recentSignals: Array<{ signalType: string; offerId: string | null }>;
  }>(integrityResponse);

  assert.ok((integrityPayload.signalCounts.cross_drop_transition_blocked ?? 0) >= 1);
  assert.ok((integrityPayload.signalCounts.reaward_blocked ?? 0) >= 1);
  assert.ok(
    integrityPayload.recentSignals.some(
      (signal) =>
        signal.signalType === "cross_drop_transition_blocked" && signal.offerId === resaleOfferId
    )
  );
  assert.ok(
    integrityPayload.recentSignals.some((signal) => signal.signalType === "reaward_blocked")
  );
});
