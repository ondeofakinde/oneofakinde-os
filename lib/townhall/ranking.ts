import type { Drop } from "@/lib/domain/contracts";

export type TownhallEngagementSignals = {
  watched: number;
  collected: number;
  liked: number;
  shared: number;
  commented: number;
  saved: number;
};

type TownhallRankingOptions = {
  now?: Date;
  signalsByDropId?: Record<string, Partial<TownhallEngagementSignals>>;
};

const DAY_MS = 86_400_000;

const MOCK_SIGNALS_BY_DROP_ID: Record<string, TownhallEngagementSignals> = {
  stardust: {
    watched: 192_000,
    collected: 2_910,
    liked: 32_400,
    shared: 3_400,
    commented: 5_800,
    saved: 9_200
  },
  "through-the-lens": {
    watched: 131_000,
    collected: 2_260,
    liked: 21_800,
    shared: 2_700,
    commented: 4_100,
    saved: 6_700
  },
  voidrunner: {
    watched: 145_000,
    collected: 3_480,
    liked: 19_200,
    shared: 2_100,
    commented: 3_700,
    saved: 7_900
  },
  "twilight-whispers": {
    watched: 118_000,
    collected: 2_020,
    liked: 17_500,
    shared: 1_960,
    commented: 2_840,
    saved: 5_400
  }
};

function parseReleaseDate(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mockSignalsForDrop(drop: Drop): TownhallEngagementSignals {
  const seeded = MOCK_SIGNALS_BY_DROP_ID[drop.id];
  if (seeded) {
    return seeded;
  }

  // Stable fallback until telemetry is live for newly published drops.
  const seed = hashSeed(`${drop.id}:${drop.releaseDate}:${drop.worldId}`);
  return {
    watched: 40_000 + (seed % 90_000),
    collected: 500 + (seed % 2_000),
    liked: 4_000 + (seed % 11_000),
    shared: 500 + (seed % 2_200),
    commented: 350 + (seed % 1_700),
    saved: 900 + (seed % 3_100)
  };
}

function mergeSignals(
  baseline: TownhallEngagementSignals,
  override?: Partial<TownhallEngagementSignals>
): TownhallEngagementSignals {
  if (!override) {
    return baseline;
  }

  return {
    watched: override.watched ?? baseline.watched,
    collected: override.collected ?? baseline.collected,
    liked: override.liked ?? baseline.liked,
    shared: override.shared ?? baseline.shared,
    commented: override.commented ?? baseline.commented,
    saved: override.saved ?? baseline.saved
  };
}

function engagementRawScore(signals: TownhallEngagementSignals): number {
  return (
    signals.collected * 4 +
    signals.watched * 1 +
    signals.liked * 0.25 +
    signals.shared * 0.55 +
    signals.commented * 0.65 +
    signals.saved * 0.3
  );
}

function recencyScore(nowMs: number, releaseMs: number): number {
  if (releaseMs <= 0) {
    return 0;
  }

  const ageDays = Math.max(0, (nowMs - releaseMs) / DAY_MS);
  return Math.exp(-ageDays / 18);
}

export function rankDropsForTownhall(drops: Drop[], options: TownhallRankingOptions = {}): Drop[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  const scored = drops.map((drop) => {
    const releaseMs = parseReleaseDate(drop.releaseDate);
    const signals = mergeSignals(mockSignalsForDrop(drop), options.signalsByDropId?.[drop.id]);
    return {
      drop,
      releaseMs,
      recency: recencyScore(nowMs, releaseMs),
      engagement: engagementRawScore(signals)
    };
  });

  const maxEngagement = scored.reduce((best, entry) => Math.max(best, entry.engagement), 0);

  return scored
    .map((entry) => {
      const engagementScore = maxEngagement > 0 ? entry.engagement / maxEngagement : 0;
      const blendedScore = engagementScore * 0.58 + entry.recency * 0.42;
      return {
        ...entry,
        blendedScore
      };
    })
    .sort((a, b) => {
      if (b.blendedScore !== a.blendedScore) {
        return b.blendedScore - a.blendedScore;
      }

      if (b.releaseMs !== a.releaseMs) {
        return b.releaseMs - a.releaseMs;
      }

      return a.drop.title.localeCompare(b.drop.title);
    })
    .map((entry) => entry.drop);
}
