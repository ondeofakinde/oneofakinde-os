import assert from "node:assert/strict";
import test from "node:test";
import type { Drop } from "../../lib/domain/contracts";
import { rankDropsForTownhall } from "../../lib/townhall/ranking";

function makeDrop(id: string, releaseDate: string): Drop {
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
    priceUsd: 1.99
  };
}

test("townhall ranking keeps all drops", () => {
  const drops = [
    makeDrop("alpha", "2026-02-15"),
    makeDrop("beta", "2026-02-14"),
    makeDrop("gamma", "2026-02-13")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z")
  });

  assert.equal(ranked.length, drops.length);
  assert.deepEqual(
    [...ranked.map((drop) => drop.id)].sort(),
    [...drops.map((drop) => drop.id)].sort()
  );
});

test("townhall ranking blends recency with engagement", () => {
  const drops = [
    makeDrop("new-low", "2026-02-19"),
    makeDrop("old-high", "2026-01-15"),
    makeDrop("mid-mid", "2026-02-10")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    signalsByDropId: {
      "new-low": {
        watched: 200,
        collected: 2,
        liked: 20,
        shared: 1,
        commented: 1,
        saved: 4
      },
      "old-high": {
        watched: 400_000,
        collected: 22_000,
        liked: 51_000,
        shared: 8_500,
        commented: 7_900,
        saved: 13_000
      },
      "mid-mid": {
        watched: 50_000,
        collected: 2_000,
        liked: 8_000,
        shared: 1_400,
        commented: 1_100,
        saved: 3_200
      }
    }
  });

  assert.equal(ranked[0]?.id, "old-high");
  assert.notEqual(ranked[0]?.id, "new-low");
  assert.deepEqual(
    [...ranked.map((drop) => drop.id)].sort(),
    ["mid-mid", "new-low", "old-high"].sort()
  );
});

test("townhall ranking falls back to newest when engagement ties", () => {
  const drops = [
    makeDrop("newer", "2026-02-19"),
    makeDrop("older", "2026-02-01")
  ];

  const equalSignals = {
    watched: 10_000,
    collected: 900,
    liked: 2_000,
    shared: 300,
    commented: 250,
    saved: 600
  };

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    signalsByDropId: {
      newer: equalSignals,
      older: equalSignals
    }
  });

  assert.equal(ranked[0]?.id, "newer");
  assert.equal(ranked[1]?.id, "older");
});
