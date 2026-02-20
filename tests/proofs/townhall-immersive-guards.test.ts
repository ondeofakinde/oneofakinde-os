import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldExitImmersiveOnScroll,
  shouldIgnoreRapidTap,
  shouldIgnoreSyntheticFollowupClick
} from "../../features/townhall/immersive-guards";

test("townhall immersive guard: synthetic click after pointer is ignored", () => {
  assert.equal(
    shouldIgnoreSyntheticFollowupClick({
      source: "click",
      nowMs: 1_000,
      lastPointerTapMs: 600
    }),
    true
  );

  assert.equal(
    shouldIgnoreSyntheticFollowupClick({
      source: "click",
      nowMs: 1_500,
      lastPointerTapMs: 600
    }),
    false
  );

  assert.equal(
    shouldIgnoreSyntheticFollowupClick({
      source: "pointer",
      nowMs: 1_000,
      lastPointerTapMs: 999
    }),
    false
  );
});

test("townhall immersive guard: rapid double tap is ignored", () => {
  assert.equal(
    shouldIgnoreRapidTap({
      nowMs: 10_000,
      lastTapMs: 9_900
    }),
    true
  );

  assert.equal(
    shouldIgnoreRapidTap({
      nowMs: 10_000,
      lastTapMs: 9_700
    }),
    false
  );
});

test("townhall immersive guard: scroll exit matrix for desktop/mobile edge cases", () => {
  const matrix = [
    {
      name: "ignore ambient scroll in immersive when explicit intent is absent",
      input: {
        isImmersive: true,
        showControls: false,
        delta: 220,
        nowMs: 2_000,
        lastImmersiveEnterMs: 1_000,
        hasExplicitIntent: false
      },
      expected: false
    },
    {
      name: "ignore micro jitter right after entering immersive",
      input: {
        isImmersive: true,
        showControls: false,
        delta: 24,
        nowMs: 1_250,
        lastImmersiveEnterMs: 1_000,
        hasExplicitIntent: true
      },
      expected: false
    },
    {
      name: "exit immersive on deliberate scroll intent",
      input: {
        isImmersive: true,
        showControls: false,
        delta: 140,
        nowMs: 1_250,
        lastImmersiveEnterMs: 1_000,
        hasExplicitIntent: true
      },
      expected: true
    },
    {
      name: "exit immersive on later scroll with intent",
      input: {
        isImmersive: true,
        showControls: false,
        delta: 32,
        nowMs: 3_400,
        lastImmersiveEnterMs: 1_000,
        hasExplicitIntent: true
      },
      expected: true
    },
    {
      name: "ignore tiny ambient scroll when not immersive",
      input: {
        isImmersive: false,
        showControls: true,
        delta: 6,
        nowMs: 3_400,
        lastImmersiveEnterMs: 1_000,
        hasExplicitIntent: true
      },
      expected: false
    },
    {
      name: "close controls on meaningful scroll when not immersive",
      input: {
        isImmersive: false,
        showControls: true,
        delta: 28,
        nowMs: 3_400,
        lastImmersiveEnterMs: 1_000,
        hasExplicitIntent: true
      },
      expected: true
    }
  ] as const;

  for (const row of matrix) {
    assert.equal(shouldExitImmersiveOnScroll(row.input), row.expected, row.name);
  }
});
