import assert from "node:assert/strict";
import test from "node:test";
import type { Drop, DropPreviewMap } from "../../lib/domain/contracts";
import { buildDropPreviewAssetKey, resolveDropPreview } from "../../lib/townhall/preview-media";

const baseDrop: Drop = {
  id: "drop-preview-proof",
  title: "preview proof",
  seasonLabel: "season one",
  episodeLabel: "episode one",
  studioHandle: "oneofakinde",
  worldId: "dark-matter",
  worldLabel: "dark matter",
  synopsis: "this is the preview synopsis fallback.",
  releaseDate: "2026-02-20",
  priceUsd: 1.99
};

function withPreviewMedia(previewMedia: DropPreviewMap): Drop {
  return {
    ...baseDrop,
    previewMedia
  };
}

test("resolveDropPreview selects mode-specific asset when present", () => {
  const drop = withPreviewMedia({
    watch: { type: "video", src: "https://cdn.example/watch.mp4" },
    photos: { type: "image", src: "https://cdn.example/photos.jpg" }
  });

  const resolved = resolveDropPreview(drop, "watch");
  assert.equal(resolved.mode, "watch");
  assert.equal(resolved.asset.type, "video");
  assert.equal(resolved.asset.src, "https://cdn.example/watch.mp4");
  assert.equal(resolved.fallbackDepth, 0);
});

test("resolveDropPreview falls back by mode order when requested mode is missing", () => {
  const drop = withPreviewMedia({
    photos: { type: "image", src: "https://cdn.example/photos.jpg" },
    read: { type: "text", text: "fallback chapter" }
  });

  const resolved = resolveDropPreview(drop, "watch");
  assert.equal(resolved.mode, "photos");
  assert.equal(resolved.asset.type, "image");
  assert.equal(resolved.fallbackDepth, 1);
});

test("resolveDropPreview skips failed assets and promotes the next candidate", () => {
  const drop = withPreviewMedia({
    watch: { type: "video", src: "https://cdn.example/watch.mp4" },
    photos: { type: "image", src: "https://cdn.example/photos.jpg" }
  });

  const failedWatchKey = buildDropPreviewAssetKey(drop.id, "watch", {
    type: "video",
    src: "https://cdn.example/watch.mp4"
  });

  const resolved = resolveDropPreview(drop, "watch", {
    failedAssetKeys: new Set([failedWatchKey])
  });

  assert.equal(resolved.mode, "photos");
  assert.equal(resolved.asset.type, "image");
  assert.equal(resolved.asset.src, "https://cdn.example/photos.jpg");
});

test("resolveDropPreview returns image fallback for non-read modes when no valid assets are available", () => {
  const drop = withPreviewMedia({
    watch: { type: "video" },
    listen: { type: "audio" },
    read: { type: "text", text: "   " }
  });

  const resolved = resolveDropPreview(drop, "listen");
  assert.equal(resolved.asset.type, "image");
  assert.ok(typeof resolved.asset.src === "string" && resolved.asset.src.startsWith("data:image/svg+xml"));
  assert.ok(resolved.fallbackDepth > 0);
});

test("resolveDropPreview returns text fallback for read mode when no valid assets are available", () => {
  const drop = withPreviewMedia({
    watch: { type: "video" },
    listen: { type: "audio" },
    read: { type: "text", text: "   " }
  });

  const resolved = resolveDropPreview(drop, "read");
  assert.equal(resolved.asset.type, "text");
  assert.equal(resolved.asset.text, "this is the preview synopsis fallback.");
  assert.ok(resolved.fallbackDepth >= 0);
});
