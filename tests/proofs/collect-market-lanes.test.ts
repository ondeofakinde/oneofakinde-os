import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectInventorySnapshot, listCollectInventoryByLane, parseCollectMarketLane } from "../../lib/collect/market-lanes";
import type { Drop } from "../../lib/domain/contracts";

function makeDrop(id: string, releaseDate: string, priceUsd: number): Drop {
  return {
    id,
    title: id,
    seasonLabel: "season one",
    episodeLabel: "episode one",
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    worldLabel: "dark matter",
    synopsis: `${id} synopsis`,
    releaseDate,
    priceUsd
  };
}

test("proof: collect market snapshot builds inventory lanes and offer timelines", () => {
  const drops = [
    makeDrop("a", "2026-02-19", 1.99),
    makeDrop("b", "2026-02-18", 2.99),
    makeDrop("c", "2026-02-17", 3.99),
    makeDrop("d", "2026-02-16", 4.99)
  ];

  const snapshot = buildCollectInventorySnapshot(drops);
  assert.equal(snapshot.listings.length, 4);
  assert.equal(Object.keys(snapshot.offersByDropId).length, 4);

  const lanes = snapshot.listings.map((entry) => entry.lane);
  assert.deepEqual(lanes, ["sale", "auction", "resale", "sale"]);
  assert.equal(snapshot.offersByDropId["b"]?.[0]?.state, "offer_submitted");
  assert.equal(snapshot.offersByDropId["c"]?.[0]?.state, "countered");
});

test("proof: collect lane parser normalizes invalid input to all", () => {
  assert.equal(parseCollectMarketLane("auction"), "auction");
  assert.equal(parseCollectMarketLane("SALE"), "sale");
  assert.equal(parseCollectMarketLane("invalid"), "all");
  assert.equal(parseCollectMarketLane(undefined), "all");
});

test("proof: collect lane filter returns only requested lane entries", () => {
  const drops = [
    makeDrop("stardust", "2026-02-19", 1.99),
    makeDrop("voidrunner", "2026-02-18", 2.99),
    makeDrop("twilight", "2026-02-17", 3.99)
  ];
  const snapshot = buildCollectInventorySnapshot(drops);

  const auctionOnly = listCollectInventoryByLane(snapshot.listings, "auction");
  assert.equal(auctionOnly.length, 1);
  assert.equal(auctionOnly[0]?.lane, "auction");

  const resaleOnly = listCollectInventoryByLane(snapshot.listings, "resale");
  assert.equal(resaleOnly.length, 1);
  assert.equal(resaleOnly[0]?.lane, "resale");
});
