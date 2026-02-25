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

test("townhall ranking applies persisted telemetry boost", () => {
  const drops = [
    makeDrop("alpha", "2026-02-19"),
    makeDrop("beta", "2026-02-18")
  ];

  const equalSignals = {
    watched: 22_000,
    collected: 1_800,
    liked: 8_000,
    shared: 900,
    commented: 700,
    saved: 2_200
  };

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    signalsByDropId: {
      alpha: equalSignals,
      beta: equalSignals
    },
    telemetryByDropId: {
      alpha: {
        watchTimeSeconds: 30,
        completions: 0,
        collectIntents: 0
      },
      beta: {
        watchTimeSeconds: 890,
        completions: 14,
        collectIntents: 11
      }
    }
  });

  assert.equal(ranked[0]?.id, "beta");
});

test("townhall ranking supports latest order mode", () => {
  const drops = [
    makeDrop("old", "2026-02-10"),
    makeDrop("new", "2026-02-19"),
    makeDrop("mid", "2026-02-15")
  ];

  const ranked = rankDropsForTownhall(drops, {
    orderMode: "latest",
    now: new Date("2026-02-20T00:00:00.000Z")
  });

  assert.deepEqual(
    ranked.map((drop) => drop.id),
    ["new", "mid", "old"]
  );
});

test("townhall ranking supports most_collected order mode", () => {
  const drops = [
    makeDrop("new-low", "2026-02-19"),
    makeDrop("old-high", "2026-01-10"),
    makeDrop("mid-mid", "2026-02-14")
  ];

  const ranked = rankDropsForTownhall(drops, {
    orderMode: "most_collected",
    now: new Date("2026-02-20T00:00:00.000Z"),
    signalsByDropId: {
      "new-low": {
        watched: 50_000,
        collected: 140,
        liked: 10_000,
        shared: 1_000,
        commented: 800,
        saved: 2_000
      },
      "old-high": {
        watched: 20_000,
        collected: 9_200,
        liked: 3_100,
        shared: 200,
        commented: 140,
        saved: 600
      },
      "mid-mid": {
        watched: 60_000,
        collected: 1_300,
        liked: 8_200,
        shared: 980,
        commented: 730,
        saved: 2_200
      }
    }
  });

  assert.equal(ranked[0]?.id, "old-high");
});

test("townhall ranking supports most_watched order mode with telemetry", () => {
  const drops = [
    makeDrop("alpha", "2026-02-18"),
    makeDrop("beta", "2026-02-16")
  ];

  const ranked = rankDropsForTownhall(drops, {
    orderMode: "most_watched",
    now: new Date("2026-02-20T00:00:00.000Z"),
    signalsByDropId: {
      alpha: {
        watched: 20_000,
        collected: 500,
        liked: 2_000,
        shared: 200,
        commented: 150,
        saved: 400
      },
      beta: {
        watched: 18_000,
        collected: 520,
        liked: 2_200,
        shared: 210,
        commented: 160,
        saved: 430
      }
    },
    telemetryByDropId: {
      alpha: {
        watchTimeSeconds: 120,
        completions: 0,
        collectIntents: 0
      },
      beta: {
        watchTimeSeconds: 1_900,
        completions: 8,
        collectIntents: 1
      }
    }
  });

  assert.equal(ranked[0]?.id, "beta");
});
