import assert from "node:assert/strict";
import test from "node:test";
import {
  clearWatchResumeSeconds,
  hasWatchReachedCompletion,
  normalizeWatchDurationSeconds,
  normalizeWatchProgressSeconds,
  readWatchResumeSeconds,
  watchCompletionPercent,
  writeWatchResumeSeconds
} from "../../lib/watch/progress";

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

test("proof: watch progress helpers normalize/clamp and detect completion", () => {
  assert.equal(normalizeWatchDurationSeconds(undefined), null);
  assert.equal(normalizeWatchDurationSeconds(0), null);
  assert.equal(normalizeWatchDurationSeconds(210), 210);

  assert.equal(normalizeWatchProgressSeconds(undefined, 210), 0);
  assert.equal(normalizeWatchProgressSeconds(-4, 210), 0);
  assert.equal(normalizeWatchProgressSeconds(43.678, undefined), 43.68);
  assert.equal(normalizeWatchProgressSeconds(250, 210), 209);

  assert.equal(hasWatchReachedCompletion(205.8, 210), true);
  assert.equal(hasWatchReachedCompletion(110, 210), false);
  assert.equal(watchCompletionPercent(105, 210), 50);
});

test("proof: watch progress persistence stores, restores, and clears resume position", () => {
  const storage = new MemoryStorage();
  const globalScope = globalThis as unknown as { window?: unknown };
  const previousWindow = globalScope.window;
  globalScope.window = {
    localStorage: storage
  };

  const dropId = "voidrunner";

  writeWatchResumeSeconds(dropId, 64.789, 320);
  assert.equal(readWatchResumeSeconds(dropId), 64.79);

  writeWatchResumeSeconds(dropId, 319.2, 320);
  assert.equal(readWatchResumeSeconds(dropId), 0);

  writeWatchResumeSeconds(dropId, 24, 320);
  assert.equal(readWatchResumeSeconds(dropId), 24);
  clearWatchResumeSeconds(dropId);
  assert.equal(readWatchResumeSeconds(dropId), 0);

  if (previousWindow === undefined) {
    delete globalScope.window;
  } else {
    globalScope.window = previousWindow;
  }
});
