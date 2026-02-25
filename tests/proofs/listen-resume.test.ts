import assert from "node:assert/strict";
import test from "node:test";
import {
  clearListenResumeSeconds,
  hasReachedCompletion,
  normalizeDurationSeconds,
  normalizeResumeSeconds,
  readListenResumeSeconds,
  writeListenResumeSeconds
} from "../../lib/listen/resume";

class MemoryStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

test("proof: listen resume helpers normalize and clamp values", () => {
  assert.equal(normalizeDurationSeconds(undefined), null);
  assert.equal(normalizeDurationSeconds(0), null);
  assert.equal(normalizeDurationSeconds(120), 120);

  assert.equal(normalizeResumeSeconds(undefined, 120), 0);
  assert.equal(normalizeResumeSeconds(-5, 120), 0);
  assert.equal(normalizeResumeSeconds(44.889, undefined), 44.89);
  assert.equal(normalizeResumeSeconds(400, 120), 119);

  assert.equal(hasReachedCompletion(117.8, 120), true);
  assert.equal(hasReachedCompletion(119, 120), true);
});

test("proof: listen resume persistence stores, restores, and clears", () => {
  const storage = new MemoryStorage();
  const globalScope = globalThis as unknown as { window?: unknown };
  const previousWindow = globalScope.window;
  globalScope.window = {
    localStorage: storage
  };

  const dropId = "stardust";

  writeListenResumeSeconds(dropId, 42.345, 180);
  assert.equal(readListenResumeSeconds(dropId), 42.34);

  writeListenResumeSeconds(dropId, 179.5, 180);
  assert.equal(readListenResumeSeconds(dropId), 0);

  writeListenResumeSeconds(dropId, 23, 180);
  assert.equal(readListenResumeSeconds(dropId), 23);
  clearListenResumeSeconds(dropId);
  assert.equal(readListenResumeSeconds(dropId), 0);

  if (previousWindow === undefined) {
    delete globalScope.window;
  } else {
    globalScope.window = previousWindow;
  }
});
