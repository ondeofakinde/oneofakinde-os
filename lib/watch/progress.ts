const WATCH_PROGRESS_STORAGE_KEY_PREFIX = "ook:watch:resume:";
const WATCH_COMPLETE_THRESHOLD = 0.98;

function storageKey(dropId: string): string {
  return `${WATCH_PROGRESS_STORAGE_KEY_PREFIX}${dropId}`;
}

export function normalizeWatchDurationSeconds(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

export function normalizeWatchProgressSeconds(
  value: number | null | undefined,
  durationSeconds: number | null | undefined
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const duration = normalizeWatchDurationSeconds(durationSeconds);
  if (duration === null) {
    return Number(value.toFixed(2));
  }

  const maxSeek = Math.max(0, duration - 1);
  return Number(Math.min(maxSeek, value).toFixed(2));
}

export function hasWatchReachedCompletion(
  currentSeconds: number,
  durationSeconds: number | null | undefined
): boolean {
  const duration = normalizeWatchDurationSeconds(durationSeconds);
  if (duration === null) {
    return false;
  }

  if (duration <= 1) {
    return currentSeconds >= duration;
  }

  return currentSeconds / duration >= WATCH_COMPLETE_THRESHOLD;
}

export function watchCompletionPercent(
  currentSeconds: number,
  durationSeconds: number | null | undefined
): number {
  const duration = normalizeWatchDurationSeconds(durationSeconds);
  if (duration === null) {
    return 0;
  }

  if (duration <= 0) {
    return 0;
  }

  return Number(Math.min(100, Math.max(0, (currentSeconds / duration) * 100)).toFixed(2));
}

export function readWatchResumeSeconds(dropId: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(dropId));
    if (!raw) {
      return 0;
    }

    const parsed = Number(raw);
    return normalizeWatchProgressSeconds(parsed, null);
  } catch {
    return 0;
  }
}

export function writeWatchResumeSeconds(
  dropId: string,
  currentSeconds: number,
  durationSeconds: number | null | undefined
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (hasWatchReachedCompletion(currentSeconds, durationSeconds)) {
      window.localStorage.removeItem(storageKey(dropId));
      return;
    }

    const normalized = normalizeWatchProgressSeconds(currentSeconds, durationSeconds);
    if (normalized <= 0) {
      window.localStorage.removeItem(storageKey(dropId));
      return;
    }

    window.localStorage.setItem(storageKey(dropId), normalized.toString());
  } catch {
    // Best-effort persistence.
  }
}

export function clearWatchResumeSeconds(dropId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(dropId));
  } catch {
    // Best-effort.
  }
}
