import type { Drop } from "@/lib/domain/contracts";

export type WorldReadSequence = {
  orderedDrops: Drop[];
  currentIndex: number;
  previousDrop: Drop | null;
  currentDrop: Drop | null;
  nextDrop: Drop | null;
};

function parseReleaseDateTimestamp(value: string): number {
  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortWorldDropsForRead(drops: Drop[]): Drop[] {
  const deduped = new Map<string, Drop>();
  for (const drop of drops) {
    if (!deduped.has(drop.id)) {
      deduped.set(drop.id, drop);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    const releaseDelta = parseReleaseDateTimestamp(a.releaseDate) - parseReleaseDateTimestamp(b.releaseDate);
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
  });
}

export function resolveWorldReadSequence(drops: Drop[], currentDropId: string): WorldReadSequence {
  const orderedDrops = sortWorldDropsForRead(drops);
  const currentIndex = orderedDrops.findIndex((drop) => drop.id === currentDropId);

  if (currentIndex === -1) {
    return {
      orderedDrops,
      currentIndex: -1,
      previousDrop: null,
      currentDrop: null,
      nextDrop: null
    };
  }

  return {
    orderedDrops,
    currentIndex,
    previousDrop: currentIndex > 0 ? orderedDrops[currentIndex - 1] : null,
    currentDrop: orderedDrops[currentIndex] ?? null,
    nextDrop: currentIndex < orderedDrops.length - 1 ? orderedDrops[currentIndex + 1] : null
  };
}
