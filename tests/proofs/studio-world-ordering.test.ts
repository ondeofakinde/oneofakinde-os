import assert from "node:assert/strict";
import test from "node:test";
import {
  sortDropsForStudioSurface,
  sortDropsForWorldSurface,
  studioPinBoostForTownhall
} from "../../lib/catalog/drop-curation";
import type { Drop } from "../../lib/domain/contracts";

function makeDrop(
  id: string,
  releaseDate: string,
  overrides: Partial<Drop> = {}
): Drop {
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
    priceUsd: 1.99,
    ...overrides
  };
}

test("proof: studio ordering keeps pinned drops first by rank", () => {
  const drops = [
    makeDrop("unpinned-newer", "2026-02-19"),
    makeDrop("pin-2", "2026-02-12", { studioPinRank: 2 }),
    makeDrop("pin-1", "2026-02-14", { studioPinRank: 1 }),
    makeDrop("unpinned-older", "2026-02-10")
  ];

  const ordered = sortDropsForStudioSurface(drops);
  assert.deepEqual(
    ordered.map((drop) => drop.id),
    ["pin-1", "pin-2", "unpinned-newer", "unpinned-older"]
  );
});

test("proof: world ordering prefers explicit world order index before recency", () => {
  const drops = [
    makeDrop("ordered-2", "2026-02-19", { worldOrderIndex: 2 }),
    makeDrop("unordered-newer", "2026-02-20"),
    makeDrop("ordered-1", "2026-02-14", { worldOrderIndex: 1 }),
    makeDrop("unordered-older", "2026-02-10")
  ];

  const ordered = sortDropsForWorldSurface(drops);
  assert.deepEqual(
    ordered.map((drop) => drop.id),
    ["ordered-1", "ordered-2", "unordered-newer", "unordered-older"]
  );
});

test("proof: townhall pin boost decreases with lower pin priority", () => {
  const topPinned = makeDrop("pin-1", "2026-02-15", { studioPinRank: 1 });
  const lowPinned = makeDrop("pin-5", "2026-02-15", { studioPinRank: 5 });
  const unpinned = makeDrop("unpinned", "2026-02-15");

  assert.ok(studioPinBoostForTownhall(topPinned) > studioPinBoostForTownhall(lowPinned));
  assert.ok(studioPinBoostForTownhall(lowPinned) > 0);
  assert.equal(studioPinBoostForTownhall(unpinned), 0);
});
