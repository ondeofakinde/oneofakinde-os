import type { Drop } from "@/lib/domain/contracts";

function parseReleaseTimestamp(releaseDate: string): number {
  const normalized = releaseDate.includes("T") ? releaseDate : `${releaseDate}T00:00:00.000Z`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedOrderValue(value: number | undefined): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const intValue = Math.trunc(value as number);
  return intValue > 0 ? intValue : null;
}

function compareByReleaseDesc(a: Drop, b: Drop): number {
  const releaseDelta = parseReleaseTimestamp(b.releaseDate) - parseReleaseTimestamp(a.releaseDate);
  if (releaseDelta !== 0) {
    return releaseDelta;
  }

  const seasonDelta = a.seasonLabel.localeCompare(b.seasonLabel);
  if (seasonDelta !== 0) {
    return seasonDelta;
  }

  const episodeDelta = a.episodeLabel.localeCompare(b.episodeLabel);
  if (episodeDelta !== 0) {
    return episodeDelta;
  }

  return a.id.localeCompare(b.id);
}

export function studioPinRank(drop: Drop): number | null {
  return normalizedOrderValue(drop.studioPinRank);
}

export function worldOrderIndex(drop: Drop): number | null {
  return normalizedOrderValue(drop.worldOrderIndex);
}

export function isStudioPinned(drop: Drop): boolean {
  return studioPinRank(drop) !== null;
}

export function studioPinBoostForTownhall(drop: Drop): number {
  const rank = studioPinRank(drop);
  if (rank === null) {
    return 0;
  }

  return Math.max(0.02, 0.1 - (rank - 1) * 0.015);
}

export function sortDropsForStudioSurface(drops: Drop[]): Drop[] {
  return [...drops].sort((a, b) => {
    const pinA = studioPinRank(a);
    const pinB = studioPinRank(b);

    if (pinA !== null && pinB === null) {
      return -1;
    }

    if (pinA === null && pinB !== null) {
      return 1;
    }

    if (pinA !== null && pinB !== null && pinA !== pinB) {
      return pinA - pinB;
    }

    const worldOrderA = worldOrderIndex(a);
    const worldOrderB = worldOrderIndex(b);
    if (worldOrderA !== null && worldOrderB !== null && worldOrderA !== worldOrderB) {
      return worldOrderA - worldOrderB;
    }

    return compareByReleaseDesc(a, b);
  });
}

export function sortDropsForWorldSurface(drops: Drop[]): Drop[] {
  return [...drops].sort((a, b) => {
    const orderA = worldOrderIndex(a);
    const orderB = worldOrderIndex(b);

    if (orderA !== null && orderB === null) {
      return -1;
    }

    if (orderA === null && orderB !== null) {
      return 1;
    }

    if (orderA !== null && orderB !== null && orderA !== orderB) {
      return orderA - orderB;
    }

    return compareByReleaseDesc(a, b);
  });
}
