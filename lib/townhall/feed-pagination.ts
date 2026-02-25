import type { Drop } from "@/lib/domain/contracts";

const CURSOR_VERSION = 1 as const;

export const DEFAULT_TOWNHALL_FEED_PAGE_SIZE = 3;
export const MAX_TOWNHALL_FEED_PAGE_SIZE = 8;

type TownhallCursorPayload = {
  v: typeof CURSOR_VERSION;
  offset: number;
  rankedDropIds: string[];
};

export type TownhallFeedPage = {
  drops: Drop[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  totalCount: number;
};

function encodeCursor(payload: TownhallCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function isCursorPayload(value: unknown): value is TownhallCursorPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TownhallCursorPayload>;
  return (
    candidate.v === CURSOR_VERSION &&
    Number.isInteger(candidate.offset) &&
    (candidate.offset ?? -1) >= 0 &&
    Array.isArray(candidate.rankedDropIds) &&
    candidate.rankedDropIds.every((entry) => typeof entry === "string")
  );
}

function decodeCursor(cursor: string): TownhallCursorPayload {
  let decoded = "";
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new Error("cursor is malformed");
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("cursor is malformed");
  }

  if (!isCursorPayload(parsed)) {
    throw new Error("cursor is invalid");
  }

  return parsed;
}

function orderDropsByCursorIds(drops: Drop[], rankedDropIds: string[]): Drop[] {
  const byId = new Map(drops.map((drop) => [drop.id, drop]));
  const consumed = new Set<string>();
  const orderedFromCursor: Drop[] = [];

  for (const dropId of rankedDropIds) {
    const drop = byId.get(dropId);
    if (!drop) {
      continue;
    }

    consumed.add(drop.id);
    orderedFromCursor.push(drop);
  }

  if (consumed.size === drops.length) {
    return orderedFromCursor;
  }

  const remaining = drops.filter((drop) => !consumed.has(drop.id));
  return [...orderedFromCursor, ...remaining];
}

export function parseTownhallFeedPageSize(input: string | null | undefined): number {
  const parsed = Number.parseInt(input ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_TOWNHALL_FEED_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_TOWNHALL_FEED_PAGE_SIZE);
}

export function paginateTownhallFeed(
  rankedDrops: Drop[],
  options?: {
    cursor?: string | null;
    pageSize?: number;
  }
): TownhallFeedPage {
  const pageSize = Math.max(
    1,
    Math.min(options?.pageSize ?? DEFAULT_TOWNHALL_FEED_PAGE_SIZE, MAX_TOWNHALL_FEED_PAGE_SIZE)
  );

  const cursorValue = options?.cursor?.trim();
  const parsedCursor = cursorValue ? decodeCursor(cursorValue) : null;
  const orderedDrops = parsedCursor
    ? orderDropsByCursorIds(rankedDrops, parsedCursor.rankedDropIds)
    : rankedDrops;
  const startOffset = parsedCursor?.offset ?? 0;
  const safeOffset = Math.min(startOffset, orderedDrops.length);
  const pageDrops = orderedDrops.slice(safeOffset, safeOffset + pageSize);
  const nextOffset = safeOffset + pageDrops.length;
  const hasMore = nextOffset < orderedDrops.length;
  const nextCursor = hasMore
    ? encodeCursor({
        v: CURSOR_VERSION,
        offset: nextOffset,
        rankedDropIds: orderedDrops.map((drop) => drop.id)
      })
    : null;

  return {
    drops: pageDrops,
    nextCursor,
    hasMore,
    pageSize,
    totalCount: orderedDrops.length
  };
}
