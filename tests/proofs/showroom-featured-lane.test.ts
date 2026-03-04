import assert from "node:assert/strict";
import test from "node:test";
import { GET as getShowroomFeaturedRoute } from "../../app/api/v1/showroom/featured/route";

type FeaturedPayload = {
  featured: {
    laneKey: "featured";
    generatedAt: string;
    limit: number;
    entries: Array<{
      rank: number;
      reasons: string[];
      drop: {
        id: string;
        title: string;
        studioHandle: string;
        worldId: string;
        worldLabel: string;
        priceUsd: number;
      };
      telemetry: {
        collectIntents: number;
        completions: number;
        watchTimeSeconds: number;
      };
      collect: {
        lane: string;
        listingType: string;
        latestOfferState: string;
        offerCount: number;
      } | null;
    }>;
  };
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: showroom featured lane endpoint returns deterministic lane contract", async () => {
  const response = await getShowroomFeaturedRoute(
    new Request("http://127.0.0.1:3000/api/v1/showroom/featured?limit=6")
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<FeaturedPayload>(response);
  assert.equal(payload.featured.laneKey, "featured");
  assert.equal(payload.featured.limit, 6);
  assert.ok(payload.featured.entries.length > 0);
  assert.ok(payload.featured.entries.length <= 6);
  assert.ok(Date.parse(payload.featured.generatedAt) > 0);

  payload.featured.entries.forEach((entry, index) => {
    assert.equal(entry.rank, index + 1);
    assert.ok(entry.reasons.length > 0);
    assert.ok(entry.drop.id);
    assert.equal(typeof entry.telemetry.collectIntents, "number");
    if (entry.collect) {
      assert.ok(!Object.hasOwn(entry.collect, "executionPriceUsd"));
      assert.ok(!Object.hasOwn(entry.collect, "accountId"));
    }
  });
});

test("proof: showroom featured lane limit is clamped to launch-safe maximum", async () => {
  const response = await getShowroomFeaturedRoute(
    new Request("http://127.0.0.1:3000/api/v1/showroom/featured?limit=999")
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<FeaturedPayload>(response);
  assert.equal(payload.featured.limit, 24);
  assert.ok(payload.featured.entries.length <= 24);
});
