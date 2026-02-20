import assert from "node:assert/strict";
import test from "node:test";
import type { Drop } from "../../lib/domain/contracts";
import { resolveDropModeForTownhallSurface } from "../../lib/townhall/feed-mode";

const baseDrop: Drop = {
  id: "mode-drop",
  title: "mode drop",
  seasonLabel: "season one",
  episodeLabel: "episode one",
  studioHandle: "oneofakinde",
  worldId: "dark-matter",
  worldLabel: "dark matter",
  synopsis: "townhall mode test drop.",
  releaseDate: "2026-02-20",
  priceUsd: 1.99
};

test("feed-mode returns requested non-townhall mode directly", () => {
  const resolved = resolveDropModeForTownhallSurface(baseDrop, 0, "listen");
  assert.equal(resolved, "listen");
});

test("feed-mode selects available preview mode for townhall surface", () => {
  const drop: Drop = {
    ...baseDrop,
    previewMedia: {
      read: { type: "text", text: "chapter excerpt" },
      gallery: { type: "image", src: "https://cdn.example/gallery.jpg" }
    }
  };

  const first = resolveDropModeForTownhallSurface(drop, 0, "townhall");

  assert.equal(first, "gallery");
});

test("feed-mode falls back to watch when preview map is missing", () => {
  const m0 = resolveDropModeForTownhallSurface(baseDrop, 0, "townhall");

  assert.equal(m0, "watch");
});
