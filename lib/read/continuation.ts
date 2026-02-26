const READ_AUTO_CONTINUATION_STORAGE_KEY = "ook:read:auto-continuation";

function normalizeBoolean(input: unknown): boolean {
  if (input === true || input === "true" || input === 1 || input === "1") {
    return true;
  }

  if (input === false || input === "false" || input === 0 || input === "0") {
    return false;
  }

  return false;
}

export function readReadAutoContinuationEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(READ_AUTO_CONTINUATION_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    return normalizeBoolean(JSON.parse(raw));
  } catch {
    return false;
  }
}

export function writeReadAutoContinuationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(READ_AUTO_CONTINUATION_STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    // Best effort only.
  }
}
