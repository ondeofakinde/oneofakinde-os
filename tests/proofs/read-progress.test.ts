import assert from "node:assert/strict";
import test from "node:test";
import {
  clearReadProgress,
  hasReadReachedCompletion,
  normalizeReadProgressPercent,
  readReadProgress,
  writeReadProgress
} from "../../lib/read/progress";

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

test("proof: read progress helpers normalize and complete consistently", () => {
  assert.equal(normalizeReadProgressPercent(undefined), 0);
  assert.equal(normalizeReadProgressPercent(-10), 0);
  assert.equal(normalizeReadProgressPercent(44.567), 44.57);
  assert.equal(normalizeReadProgressPercent(180), 100);

  assert.equal(hasReadReachedCompletion(94.99), false);
  assert.equal(hasReadReachedCompletion(95), true);
  assert.equal(hasReadReachedCompletion(100), true);
});

test("proof: read progress persistence stores and restores section + percent", () => {
  const storage = new MemoryStorage();
  const globalScope = globalThis as unknown as { window?: unknown };
  const previousWindow = globalScope.window;
  globalScope.window = {
    localStorage: storage
  };

  const dropId = "through-the-lens";
  writeReadProgress(dropId, {
    percent: 38.456,
    lastSectionId: "overview-1"
  });
  assert.deepEqual(readReadProgress(dropId), {
    percent: 38.46,
    lastSectionId: "overview-1"
  });

  writeReadProgress(dropId, {
    percent: 0,
    lastSectionId: null
  });
  assert.deepEqual(readReadProgress(dropId), {
    percent: 0,
    lastSectionId: null
  });

  writeReadProgress(dropId, {
    percent: 100,
    lastSectionId: "world-notes-3"
  });
  assert.deepEqual(readReadProgress(dropId), {
    percent: 100,
    lastSectionId: "world-notes-3"
  });
  clearReadProgress(dropId);
  assert.deepEqual(readReadProgress(dropId), {
    percent: 0,
    lastSectionId: null
  });

  if (previousWindow === undefined) {
    delete globalScope.window;
  } else {
    globalScope.window = previousWindow;
  }
});
