import type { Drop, TownhallTelemetrySignals } from "@/lib/domain/contracts";
import type { TownhallOrderMode } from "@/lib/townhall/order";

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
  orderMode?: TownhallOrderMode;
  signalsByDropId?: Record<string, Partial<TownhallEngagementSignals>>;
  telemetryByDropId?: Record<string, Partial<TownhallTelemetrySignals>>;
};

type ScoredEntry = {
  drop: Drop;
  releaseMs: number;
  recency: number;
  engagement: number;
  telemetry: number;
  signals: TownhallEngagementSignals;
  telemetrySignals: TownhallTelemetrySignals;
  blendedScore: number;
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

function mergeTelemetrySignals(
  override?: Partial<TownhallTelemetrySignals>
): TownhallTelemetrySignals {
  return {
    watchTimeSeconds: override?.watchTimeSeconds ?? 0,
    completions: override?.completions ?? 0,
    collectIntents: override?.collectIntents ?? 0
  };
}

function telemetryRawScore(signals: TownhallTelemetrySignals): number {
  return signals.watchTimeSeconds * 0.75 + signals.completions * 600 + signals.collectIntents * 800;
}

function compareByReleaseAndTitle(a: ScoredEntry, b: ScoredEntry): number {
  if (b.releaseMs !== a.releaseMs) {
    return b.releaseMs - a.releaseMs;
  }

  return a.drop.title.localeCompare(b.drop.title);
}

function compareByConstitutional(a: ScoredEntry, b: ScoredEntry): number {
  if (b.blendedScore !== a.blendedScore) {
    return b.blendedScore - a.blendedScore;
  }

  return compareByReleaseAndTitle(a, b);
}

function compareByMostCollected(a: ScoredEntry, b: ScoredEntry): number {
  if (b.signals.collected !== a.signals.collected) {
    return b.signals.collected - a.signals.collected;
  }

  if (b.telemetrySignals.collectIntents !== a.telemetrySignals.collectIntents) {
    return b.telemetrySignals.collectIntents - a.telemetrySignals.collectIntents;
  }

  return compareByReleaseAndTitle(a, b);
}

function watchActivityScore(entry: ScoredEntry): number {
  return (
    entry.signals.watched +
    entry.telemetrySignals.watchTimeSeconds * 10 +
    entry.telemetrySignals.completions * 2_000
  );
}

function compareByMostWatched(a: ScoredEntry, b: ScoredEntry): number {
  const aWatchScore = watchActivityScore(a);
  const bWatchScore = watchActivityScore(b);

  if (bWatchScore !== aWatchScore) {
    return bWatchScore - aWatchScore;
  }

  return compareByReleaseAndTitle(a, b);
}

export function rankDropsForTownhall(drops: Drop[], options: TownhallRankingOptions = {}): Drop[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const orderMode = options.orderMode ?? "constitutional";

  const scored = drops.map((drop) => {
    const releaseMs = parseReleaseDate(drop.releaseDate);
    const signals = mergeSignals(mockSignalsForDrop(drop), options.signalsByDropId?.[drop.id]);
    const telemetrySignals = mergeTelemetrySignals(options.telemetryByDropId?.[drop.id]);
    return {
      drop,
      releaseMs,
      recency: recencyScore(nowMs, releaseMs),
      engagement: engagementRawScore(signals),
      telemetry: telemetryRawScore(telemetrySignals),
      signals,
      telemetrySignals,
      blendedScore: 0
    } satisfies ScoredEntry;
  });

  const maxEngagement = scored.reduce((best, entry) => Math.max(best, entry.engagement), 0);
  const maxTelemetry = scored.reduce((best, entry) => Math.max(best, entry.telemetry), 0);

  const withBlendedScore = scored.map((entry) => {
    const engagementScore = maxEngagement > 0 ? entry.engagement / maxEngagement : 0;
    const telemetryScore = maxTelemetry > 0 ? entry.telemetry / maxTelemetry : 0;
    const blendedScore = engagementScore * 0.5 + entry.recency * 0.32 + telemetryScore * 0.18;
    return {
      ...entry,
      blendedScore
    } satisfies ScoredEntry;
  });

  const sorted = [...withBlendedScore].sort((a, b) => {
    if (orderMode === "latest") {
      return compareByReleaseAndTitle(a, b);
    }

    if (orderMode === "most_collected") {
      return compareByMostCollected(a, b);
    }

    if (orderMode === "most_watched") {
      return compareByMostWatched(a, b);
    }

    return compareByConstitutional(a, b);
  });

  return sorted.map((entry) => entry.drop);
}
