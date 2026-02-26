import assert from "node:assert/strict";
import test from "node:test";
import {
  readReadAutoContinuationEnabled,
  writeReadAutoContinuationEnabled
} from "../../lib/read/continuation";

class MemoryStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test("proof: read auto continuation defaults to disabled", () => {
  assert.equal(readReadAutoContinuationEnabled(), false);
});

test("proof: read auto continuation preference persists across reads", () => {
  const storage = new MemoryStorage();
  const globalScope = globalThis as unknown as { window?: unknown };
  const previousWindow = globalScope.window;
  globalScope.window = {
    localStorage: storage
  };

  writeReadAutoContinuationEnabled(true);
  assert.equal(readReadAutoContinuationEnabled(), true);

  writeReadAutoContinuationEnabled(false);
  assert.equal(readReadAutoContinuationEnabled(), false);

  storage.setItem("ook:read:auto-continuation", "{oops");
  assert.equal(readReadAutoContinuationEnabled(), false);

  if (previousWindow === undefined) {
    delete globalScope.window;
  } else {
    globalScope.window = previousWindow;
  }
});
