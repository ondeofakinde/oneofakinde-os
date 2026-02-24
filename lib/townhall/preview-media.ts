import type { Drop, DropPreviewAsset, DropPreviewMode } from "@/lib/domain/contracts";

export type ResolvedDropPreview = {
  mode: DropPreviewMode;
  asset: DropPreviewAsset;
  assetKey: string;
  fallbackDepth: number;
};

type ResolveDropPreviewOptions = {
  failedAssetKeys?: Set<string>;
};

const MODE_FALLBACK_ORDER: Record<DropPreviewMode, DropPreviewMode[]> = {
  watch: ["watch", "photos", "live", "listen", "read"],
  listen: ["listen", "watch", "photos", "live", "read"],
  read: ["read", "photos", "watch", "listen", "live"],
  photos: ["photos", "watch", "live", "listen", "read"],
  live: ["live", "watch", "photos", "listen", "read"]
};

const FALLBACK_PALETTE = [
  { glow: "#1f5b7f", edge: "#041018", accent: "#92c3df" },
  { glow: "#3e4b93", edge: "#080b19", accent: "#b7c8ff" },
  { glow: "#346f6a", edge: "#040f10", accent: "#9fe8df" },
  { glow: "#5f4a2f", edge: "#120b04", accent: "#f0d5a8" }
] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fallbackImageDataUri(drop: Drop): string {
  const palette = FALLBACK_PALETTE[hashSeed(drop.id) % FALLBACK_PALETTE.length];
  const studio = escapeSvgText(`@${drop.studioHandle}`);
  const title = escapeSvgText(drop.title);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1500" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="64%">
      <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.78"/>
      <stop offset="56%" stop-color="${palette.glow}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${palette.edge}" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="900" height="1500" fill="${palette.edge}"/>
  <rect width="900" height="1500" fill="url(#g)"/>
  <text x="56" y="1220" fill="${palette.accent}" opacity="0.9" font-family="Arial,sans-serif" font-size="34" letter-spacing="2">${studio}</text>
  <text x="56" y="1290" fill="#f3f7fb" font-family="Arial,sans-serif" font-size="96" font-weight="700">${title}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeTextAsset(drop: Drop, asset: DropPreviewAsset): DropPreviewAsset | null {
  const text = asset.text?.trim() || drop.synopsis.trim();
  if (!text) {
    return null;
  }

  return {
    ...asset,
    type: "text",
    text,
    alt: asset.alt?.trim() || `${drop.title} preview`
  };
}

function normalizeMediaAsset(drop: Drop, asset: DropPreviewAsset): DropPreviewAsset | null {
  const src = asset.src?.trim();
  if (!src) {
    return null;
  }

  return {
    ...asset,
    src,
    posterSrc: asset.posterSrc?.trim() || undefined,
    alt: asset.alt?.trim() || `${drop.title} preview`
  };
}

function normalizeAsset(drop: Drop, asset: DropPreviewAsset): DropPreviewAsset | null {
  if (asset.type === "text") {
    return normalizeTextAsset(drop, asset);
  }

  return normalizeMediaAsset(drop, asset);
}

export function buildDropPreviewAssetKey(dropId: string, mode: DropPreviewMode, asset: DropPreviewAsset): string {
  const signature = asset.type === "text" ? asset.text || "" : asset.src || "";
  return `${dropId}:${mode}:${asset.type}:${signature}`;
}

function fallbackTextAsset(drop: Drop): DropPreviewAsset {
  return {
    type: "text",
    text: drop.synopsis.trim() || `${drop.title} preview`,
    alt: `${drop.title} preview`
  };
}

function fallbackImageAsset(drop: Drop): DropPreviewAsset {
  return {
    type: "image",
    src: fallbackImageDataUri(drop),
    alt: `${drop.title} preview`
  };
}

export function resolveDropPreview(
  drop: Drop,
  mode: DropPreviewMode,
  options: ResolveDropPreviewOptions = {}
): ResolvedDropPreview {
  const failedAssetKeys = options.failedAssetKeys;
  const orderedModes = MODE_FALLBACK_ORDER[mode];

  for (const [index, candidateMode] of orderedModes.entries()) {
    const rawAsset = drop.previewMedia?.[candidateMode];
    if (!rawAsset) {
      continue;
    }

    const asset = normalizeAsset(drop, rawAsset);
    if (!asset) {
      continue;
    }

    if (asset.type === "text" && mode !== "read") {
      continue;
    }

    const assetKey = buildDropPreviewAssetKey(drop.id, candidateMode, asset);
    if (failedAssetKeys?.has(assetKey)) {
      continue;
    }

    return {
      mode: candidateMode,
      asset,
      assetKey,
      fallbackDepth: index
    };
  }

  const asset = mode === "read" ? fallbackTextAsset(drop) : fallbackImageAsset(drop);
  return {
    mode,
    asset,
    assetKey: buildDropPreviewAssetKey(drop.id, mode, asset),
    fallbackDepth: orderedModes.length
  };
}
