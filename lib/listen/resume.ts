const RESUME_STORAGE_KEY_PREFIX = "ook:listen:resume:";
const RESUME_COMPLETE_THRESHOLD = 0.98;

function storageKey(dropId: string): string {
  return `${RESUME_STORAGE_KEY_PREFIX}${dropId}`;
}

export function normalizeDurationSeconds(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

export function normalizeResumeSeconds(
  value: number | null | undefined,
  durationSeconds: number | null | undefined
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const duration = normalizeDurationSeconds(durationSeconds);
  if (duration === null) {
    return Number(value.toFixed(2));
  }

  const maxSeek = Math.max(0, duration - 1);
  return Number(Math.min(maxSeek, value).toFixed(2));
}

export function hasReachedCompletion(
  currentSeconds: number,
  durationSeconds: number | null | undefined
): boolean {
  const duration = normalizeDurationSeconds(durationSeconds);
  if (duration === null) {
    return false;
  }

  if (duration <= 1) {
    return currentSeconds >= duration;
  }

  return currentSeconds / duration >= RESUME_COMPLETE_THRESHOLD;
}

export function readListenResumeSeconds(dropId: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(dropId));
    if (!raw) {
      return 0;
    }

    const parsed = Number(raw);
    return normalizeResumeSeconds(parsed, null);
  } catch {
    return 0;
  }
}

export function writeListenResumeSeconds(
  dropId: string,
  currentSeconds: number,
  durationSeconds: number | null | undefined
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (hasReachedCompletion(currentSeconds, durationSeconds)) {
      window.localStorage.removeItem(storageKey(dropId));
      return;
    }

    const normalized = normalizeResumeSeconds(currentSeconds, durationSeconds);
    if (normalized <= 0) {
      window.localStorage.removeItem(storageKey(dropId));
      return;
    }

    window.localStorage.setItem(storageKey(dropId), normalized.toString());
  } catch {
    // Resume persistence is best-effort.
  }
}

export function clearListenResumeSeconds(dropId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(dropId));
  } catch {
    // Best-effort.
  }
}
