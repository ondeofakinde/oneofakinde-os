import assert from "node:assert/strict";
import test from "node:test";
import type { Drop } from "../../lib/domain/contracts";
import {
  resolveHighestQualityLevel,
  resolveNextLowerQualityLevel,
  resolveWatchQualityLadder
} from "../../lib/watch/quality-ladder";

const DROP_BASE: Drop = {
  id: "stardust",
  title: "stardust",
  seasonLabel: "season one",
  episodeLabel: "episode one",
  studioHandle: "oneofakinde",
  worldId: "dark-matter",
  worldLabel: "dark matter",
  synopsis: "through the dark, stardust traces identity in motion.",
  releaseDate: "2026-02-16",
  priceUsd: 1.99,
  previewMedia: {
    watch: {
      type: "video",
      src: "https://cdn.example.com/watch/stardust.mp4"
    }
  }
};

test("proof: watch quality ladder derives fallback sources when explicit ladder is absent", () => {
  const ladder = resolveWatchQualityLadder(DROP_BASE);

  assert.deepEqual(ladder.availableLevels, ["high", "medium", "low"]);
  assert.equal(ladder.sourcesByLevel.high, "https://cdn.example.com/watch/stardust.mp4");
  assert.equal(
    ladder.sourcesByLevel.medium,
    "https://cdn.example.com/watch/stardust.mp4?ook_quality=medium"
  );
  assert.equal(
    ladder.sourcesByLevel.low,
    "https://cdn.example.com/watch/stardust.mp4?ook_quality=low"
  );
});

test("proof: watch quality ladder honors explicit per-level sources", () => {
  const ladder = resolveWatchQualityLadder({
    ...DROP_BASE,
    previewMedia: {
      watch: {
        type: "video",
        src: "https://cdn.example.com/watch/stardust.mp4",
        watchQualitySources: {
          high: "https://cdn.example.com/watch/stardust-1080.mp4",
          medium: "https://cdn.example.com/watch/stardust-720.mp4",
          low: "https://cdn.example.com/watch/stardust-480.mp4"
        }
      }
    }
  });

  assert.equal(ladder.sourcesByLevel.high, "https://cdn.example.com/watch/stardust-1080.mp4");
  assert.equal(ladder.sourcesByLevel.medium, "https://cdn.example.com/watch/stardust-720.mp4");
  assert.equal(ladder.sourcesByLevel.low, "https://cdn.example.com/watch/stardust-480.mp4");
});

test("proof: quality ladder helpers resolve highest and next lower levels safely", () => {
  assert.equal(resolveHighestQualityLevel(["high", "medium", "low"]), "high");
  assert.equal(resolveHighestQualityLevel(["medium", "low"]), "medium");
  assert.equal(resolveHighestQualityLevel(["low"]), "low");

  assert.equal(resolveNextLowerQualityLevel("high", ["high", "medium", "low"]), "medium");
  assert.equal(resolveNextLowerQualityLevel("medium", ["high", "medium", "low"]), "low");
  assert.equal(resolveNextLowerQualityLevel("low", ["high", "medium", "low"]), null);
  assert.equal(resolveNextLowerQualityLevel("high", ["high", "low"]), "low");
});
