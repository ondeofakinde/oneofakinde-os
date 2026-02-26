const READ_PROGRESS_STORAGE_KEY_PREFIX = "ook:read:progress:";
const READ_COMPLETE_THRESHOLD_PERCENT = 95;

export type ReadProgressSnapshot = {
  percent: number;
  lastSectionId: string | null;
};

function storageKey(dropId: string): string {
  return `${READ_PROGRESS_STORAGE_KEY_PREFIX}${dropId}`;
}

export function normalizeReadProgressPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

export function hasReadReachedCompletion(percent: number): boolean {
  return normalizeReadProgressPercent(percent) >= READ_COMPLETE_THRESHOLD_PERCENT;
}

export function readReadProgress(dropId: string): ReadProgressSnapshot {
  if (typeof window === "undefined") {
    return {
      percent: 0,
      lastSectionId: null
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(dropId));
    if (!raw) {
      return {
        percent: 0,
        lastSectionId: null
      };
    }

    const parsed = JSON.parse(raw) as { percent?: unknown; lastSectionId?: unknown };
    const percent =
      typeof parsed.percent === "number" ? normalizeReadProgressPercent(parsed.percent) : 0;
    const lastSectionId =
      typeof parsed.lastSectionId === "string" && parsed.lastSectionId.trim().length > 0
        ? parsed.lastSectionId
        : null;

    return {
      percent,
      lastSectionId
    };
  } catch {
    return {
      percent: 0,
      lastSectionId: null
    };
  }
}

export function writeReadProgress(
  dropId: string,
  input: ReadProgressSnapshot
): void {
  if (typeof window === "undefined") {
    return;
  }

  const percent = normalizeReadProgressPercent(input.percent);
  const lastSectionId =
    typeof input.lastSectionId === "string" && input.lastSectionId.trim().length > 0
      ? input.lastSectionId
      : null;

  try {
    if (percent <= 0 && !lastSectionId) {
      window.localStorage.removeItem(storageKey(dropId));
      return;
    }

    window.localStorage.setItem(
      storageKey(dropId),
      JSON.stringify({
        percent,
        lastSectionId
      })
    );
  } catch {
    // Best effort persistence.
  }
}

export function clearReadProgress(dropId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(dropId));
  } catch {
    // Best effort persistence.
  }
}
