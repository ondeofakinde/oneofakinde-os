import type { Drop, DropPreviewMode } from "@/lib/domain/contracts";

export type TownhallShowroomMediaFilter = "all" | DropPreviewMode;
export type TownhallShowroomOrdering = "rising" | "newest" | "most_collected";

export const TOWNHALL_SHOWROOM_MEDIA_FILTERS: TownhallShowroomMediaFilter[] = [
  "all",
  "watch",
  "listen",
  "read",
  "photos",
  "live"
];

export const TOWNHALL_SHOWROOM_ORDERINGS: TownhallShowroomOrdering[] = [
  "rising",
  "newest",
  "most_collected"
];

export const DEFAULT_TOWNHALL_SHOWROOM_MEDIA_FILTER: TownhallShowroomMediaFilter = "all";
export const DEFAULT_TOWNHALL_SHOWROOM_ORDERING: TownhallShowroomOrdering = "rising";

export function parseTownhallShowroomMediaFilter(
  input: string | null | undefined
): TownhallShowroomMediaFilter {
  const normalized = input?.trim().toLowerCase();
  if (
    normalized &&
    TOWNHALL_SHOWROOM_MEDIA_FILTERS.includes(normalized as TownhallShowroomMediaFilter)
  ) {
    return normalized as TownhallShowroomMediaFilter;
  }

  return DEFAULT_TOWNHALL_SHOWROOM_MEDIA_FILTER;
}

export function parseTownhallShowroomOrdering(
  input: string | null | undefined
): TownhallShowroomOrdering {
  const normalized = input?.trim().toLowerCase();
  if (normalized && TOWNHALL_SHOWROOM_ORDERINGS.includes(normalized as TownhallShowroomOrdering)) {
    return normalized as TownhallShowroomOrdering;
  }

  return DEFAULT_TOWNHALL_SHOWROOM_ORDERING;
}

export function filterDropsForShowroomMedia(
  drops: Drop[],
  mediaFilter: TownhallShowroomMediaFilter
): Drop[] {
  if (mediaFilter === "all") {
    return drops;
  }

  return drops.filter((drop) => Boolean(drop.previewMedia?.[mediaFilter]));
}
