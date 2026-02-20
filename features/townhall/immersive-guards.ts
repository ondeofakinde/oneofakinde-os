export type StageTapSource = "pointer" | "click";

type SyntheticClickInput = {
  source: StageTapSource;
  nowMs: number;
  lastPointerTapMs: number;
  followupWindowMs?: number;
};

type RapidTapInput = {
  nowMs: number;
  lastTapMs: number;
  debounceWindowMs?: number;
};

type ScrollExitInput = {
  isImmersive: boolean;
  showControls: boolean;
  delta: number;
  nowMs: number;
  lastImmersiveEnterMs: number;
  hasExplicitIntent: boolean;
  ambientDeltaThreshold?: number;
  immersiveEarlyWindowMs?: number;
  immersiveEarlyDeltaThreshold?: number;
};

const DEFAULT_SYNTHETIC_CLICK_WINDOW_MS = 700;
const DEFAULT_RAPID_TAP_WINDOW_MS = 180;
const DEFAULT_AMBIENT_DELTA_THRESHOLD = 14;
const DEFAULT_IMMERSIVE_EARLY_WINDOW_MS = 900;
const DEFAULT_IMMERSIVE_EARLY_DELTA_THRESHOLD = 90;

export function shouldIgnoreSyntheticFollowupClick({
  source,
  nowMs,
  lastPointerTapMs,
  followupWindowMs = DEFAULT_SYNTHETIC_CLICK_WINDOW_MS
}: SyntheticClickInput): boolean {
  return source === "click" && nowMs - lastPointerTapMs < followupWindowMs;
}

export function shouldIgnoreRapidTap({
  nowMs,
  lastTapMs,
  debounceWindowMs = DEFAULT_RAPID_TAP_WINDOW_MS
}: RapidTapInput): boolean {
  return nowMs - lastTapMs < debounceWindowMs;
}

export function shouldExitImmersiveOnScroll({
  isImmersive,
  showControls,
  delta,
  nowMs,
  lastImmersiveEnterMs,
  hasExplicitIntent,
  ambientDeltaThreshold = DEFAULT_AMBIENT_DELTA_THRESHOLD,
  immersiveEarlyWindowMs = DEFAULT_IMMERSIVE_EARLY_WINDOW_MS,
  immersiveEarlyDeltaThreshold = DEFAULT_IMMERSIVE_EARLY_DELTA_THRESHOLD
}: ScrollExitInput): boolean {
  if (!isImmersive && !showControls) {
    return false;
  }

  if (isImmersive) {
    if (!hasExplicitIntent) {
      return false;
    }

    if (nowMs - lastImmersiveEnterMs < immersiveEarlyWindowMs && delta < immersiveEarlyDeltaThreshold) {
      return false;
    }

    return true;
  }

  return delta >= ambientDeltaThreshold;
}
