import type { Drop, WatchQualityLevel } from "@/lib/domain/contracts";

const QUALITY_LEVEL_ORDER: WatchQualityLevel[] = ["high", "medium", "low"];

function decorateSourceForQuality(source: string, level: WatchQualityLevel): string {
  const normalized = source.trim();
  if (!normalized) {
    return normalized;
  }

  const separator = normalized.includes("?") ? "&" : "?";
  return `${normalized}${separator}ook_quality=${level}`;
}

export type WatchQualityLadder = {
  availableLevels: WatchQualityLevel[];
  sourcesByLevel: Record<WatchQualityLevel, string | null>;
};

export function resolveWatchQualityLadder(drop: Drop): WatchQualityLadder {
  const watchAsset = drop.previewMedia?.watch;
  const canonicalSource = watchAsset?.type === "video" ? watchAsset.src?.trim() || null : null;
  const declaredSources = watchAsset?.watchQualitySources;

  const sourcesByLevel: Record<WatchQualityLevel, string | null> = {
    high: null,
    medium: null,
    low: null
  };

  for (const level of QUALITY_LEVEL_ORDER) {
    const declared = declaredSources?.[level]?.trim();
    if (declared) {
      sourcesByLevel[level] = declared;
      continue;
    }

    if (!canonicalSource) {
      sourcesByLevel[level] = null;
      continue;
    }

    // Fallback source variants still map to the same canonical asset if dedicated
    // quality renditions are not declared.
    sourcesByLevel[level] =
      level === "high" ? canonicalSource : decorateSourceForQuality(canonicalSource, level);
  }

  const availableLevels = QUALITY_LEVEL_ORDER.filter((level) => Boolean(sourcesByLevel[level]));
  return {
    availableLevels,
    sourcesByLevel
  };
}

export function resolveNextLowerQualityLevel(
  current: WatchQualityLevel,
  availableLevels: WatchQualityLevel[]
): WatchQualityLevel | null {
  const currentIndex = QUALITY_LEVEL_ORDER.indexOf(current);
  if (currentIndex < 0) {
    return availableLevels[0] ?? null;
  }

  for (let index = currentIndex + 1; index < QUALITY_LEVEL_ORDER.length; index += 1) {
    const candidate = QUALITY_LEVEL_ORDER[index];
    if (availableLevels.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveHighestQualityLevel(availableLevels: WatchQualityLevel[]): WatchQualityLevel {
  if (availableLevels.includes("high")) {
    return "high";
  }

  if (availableLevels.includes("medium")) {
    return "medium";
  }

  return "low";
}
