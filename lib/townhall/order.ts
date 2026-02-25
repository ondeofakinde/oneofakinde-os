export const TOWNHALL_ORDER_MODES = [
  "constitutional",
  "latest",
  "most_collected",
  "most_watched"
] as const;

export type TownhallOrderMode = (typeof TOWNHALL_ORDER_MODES)[number];

export type TownhallOrderOption = {
  value: TownhallOrderMode;
  label: string;
  note: string;
};

export const TOWNHALL_ORDER_OPTIONS: readonly TownhallOrderOption[] = [
  {
    value: "constitutional",
    label: "for you",
    note: "balanced by recency, collect intent, and engagement"
  },
  {
    value: "latest",
    label: "latest",
    note: "newest published drops first"
  },
  {
    value: "most_collected",
    label: "most collected",
    note: "drops with strongest collect momentum"
  },
  {
    value: "most_watched",
    label: "most watched",
    note: "drops with the highest watch activity"
  }
] as const;

const ORDER_VALUE_SET = new Set<string>(TOWNHALL_ORDER_MODES);

function normalizeOrderAlias(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "most-collected") return "most_collected";
  if (trimmed === "most-watched") return "most_watched";
  return trimmed;
}

export function parseTownhallOrderMode(input: string | string[] | null | undefined): TownhallOrderMode {
  if (!input) {
    return "constitutional";
  }

  const raw = Array.isArray(input) ? input[0] : input;
  const normalized = normalizeOrderAlias(raw ?? "");
  if (!ORDER_VALUE_SET.has(normalized)) {
    return "constitutional";
  }

  return normalized as TownhallOrderMode;
}
