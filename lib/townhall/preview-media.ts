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
  watch: ["watch", "gallery", "listen", "read", "live"],
  listen: ["listen", "watch", "read", "gallery", "live"],
  read: ["read", "gallery", "watch", "listen", "live"],
  gallery: ["gallery", "watch", "read", "listen", "live"],
  live: ["live", "watch", "listen", "gallery", "read"]
};

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

  const asset = fallbackTextAsset(drop);
  return {
    mode,
    asset,
    assetKey: buildDropPreviewAssetKey(drop.id, mode, asset),
    fallbackDepth: orderedModes.length
  };
}
