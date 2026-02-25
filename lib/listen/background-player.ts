export type ListenPlayerSnapshot = {
  dropId: string | null;
  src: string | null;
  currentTime: number;
  duration: number | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  ended: boolean;
};

type ListenPlayerSubscriber = (snapshot: ListenPlayerSnapshot) => void;

type ListenPlayerStore = {
  audio: HTMLAudioElement;
  dropId: string | null;
  src: string | null;
  subscribers: Set<ListenPlayerSubscriber>;
};

const LISTEN_PLAYER_WINDOW_KEY = "__ookListenPlayerStore";

type WindowWithListenPlayerStore = Window & {
  [LISTEN_PLAYER_WINDOW_KEY]?: ListenPlayerStore;
};

function normalizeDuration(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number(value.toFixed(3));
}

function normalizeCurrentTime(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value.toFixed(3));
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.7;
  }

  return Math.min(1, Math.max(0, value));
}

function toSnapshot(store: ListenPlayerStore): ListenPlayerSnapshot {
  return {
    dropId: store.dropId,
    src: store.src,
    currentTime: normalizeCurrentTime(store.audio.currentTime),
    duration: normalizeDuration(store.audio.duration),
    isPlaying: !store.audio.paused,
    isMuted: store.audio.muted,
    volume: clampVolume(store.audio.volume),
    ended: store.audio.ended
  };
}

function emit(store: ListenPlayerStore): void {
  const snapshot = toSnapshot(store);
  for (const subscriber of store.subscribers) {
    subscriber(snapshot);
  }
}

function bindStoreEvents(store: ListenPlayerStore): void {
  const events: Array<keyof HTMLMediaElementEventMap> = [
    "play",
    "pause",
    "timeupdate",
    "ended",
    "loadedmetadata",
    "durationchange",
    "volumechange",
    "seeked",
    "seeking",
    "emptied"
  ];

  for (const eventName of events) {
    store.audio.addEventListener(eventName, () => {
      emit(store);
    });
  }
}

function resolveStore(): ListenPlayerStore | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storeWindow = window as WindowWithListenPlayerStore;
  if (storeWindow[LISTEN_PLAYER_WINDOW_KEY]) {
    return storeWindow[LISTEN_PLAYER_WINDOW_KEY] ?? null;
  }

  const audio = new Audio();
  audio.preload = "metadata";
  audio.volume = 0.7;
  audio.muted = false;

  const createdStore: ListenPlayerStore = {
    audio,
    dropId: null,
    src: null,
    subscribers: new Set<ListenPlayerSubscriber>()
  };
  bindStoreEvents(createdStore);
  storeWindow[LISTEN_PLAYER_WINDOW_KEY] = createdStore;
  return createdStore;
}

function applySeek(audio: HTMLAudioElement, targetSeconds: number): void {
  if (!Number.isFinite(targetSeconds) || targetSeconds < 0) {
    return;
  }

  const duration = normalizeDuration(audio.duration);
  const maxSeek =
    duration === null
      ? targetSeconds
      : Math.max(0, duration - 0.25);
  audio.currentTime = Math.min(targetSeconds, maxSeek);
}

export function getListenPlayerSnapshot(): ListenPlayerSnapshot {
  const store = resolveStore();
  if (!store) {
    return {
      dropId: null,
      src: null,
      currentTime: 0,
      duration: null,
      isPlaying: false,
      isMuted: false,
      volume: 0.7,
      ended: false
    };
  }

  return toSnapshot(store);
}

export function subscribeListenPlayer(subscriber: ListenPlayerSubscriber): () => void {
  const store = resolveStore();
  if (!store) {
    subscriber(getListenPlayerSnapshot());
    return () => {
      // no-op outside browser
    };
  }

  store.subscribers.add(subscriber);
  subscriber(toSnapshot(store));
  return () => {
    store.subscribers.delete(subscriber);
  };
}

export function syncListenPlayerTrack(input: { dropId: string; src: string }): ListenPlayerSnapshot {
  const store = resolveStore();
  if (!store) {
    return getListenPlayerSnapshot();
  }

  const normalizedSrc = input.src.trim();
  if (!normalizedSrc) {
    return toSnapshot(store);
  }

  const hasSameTrack = store.dropId === input.dropId && store.src === normalizedSrc;
  if (hasSameTrack) {
    return toSnapshot(store);
  }

  const wasPlaying = !store.audio.paused;
  store.dropId = input.dropId;
  store.src = normalizedSrc;
  store.audio.src = normalizedSrc;
  store.audio.load();

  if (wasPlaying) {
    void store.audio.play().catch(() => {
      // Autoplay can be blocked by the browser.
    });
  }

  emit(store);
  return toSnapshot(store);
}

export function setListenPlayerMuted(muted: boolean): ListenPlayerSnapshot {
  const store = resolveStore();
  if (!store) {
    return getListenPlayerSnapshot();
  }

  store.audio.muted = Boolean(muted);
  emit(store);
  return toSnapshot(store);
}

export function setListenPlayerVolume(volume: number): ListenPlayerSnapshot {
  const store = resolveStore();
  if (!store) {
    return getListenPlayerSnapshot();
  }

  store.audio.volume = clampVolume(volume);
  emit(store);
  return toSnapshot(store);
}

export async function playListenPlayer(): Promise<ListenPlayerSnapshot> {
  const store = resolveStore();
  if (!store) {
    return getListenPlayerSnapshot();
  }

  try {
    await store.audio.play();
  } catch {
    // Browsers may reject autoplay calls without user interaction.
  }

  emit(store);
  return toSnapshot(store);
}

export function pauseListenPlayer(): ListenPlayerSnapshot {
  const store = resolveStore();
  if (!store) {
    return getListenPlayerSnapshot();
  }

  store.audio.pause();
  emit(store);
  return toSnapshot(store);
}

export function seekListenPlayer(targetSeconds: number): ListenPlayerSnapshot {
  const store = resolveStore();
  if (!store) {
    return getListenPlayerSnapshot();
  }

  if (!Number.isFinite(targetSeconds) || targetSeconds < 0) {
    return toSnapshot(store);
  }

  if (store.audio.readyState >= 1) {
    applySeek(store.audio, targetSeconds);
  } else {
    store.audio.addEventListener(
      "loadedmetadata",
      () => {
        applySeek(store.audio, targetSeconds);
      },
      { once: true }
    );
  }

  emit(store);
  return toSnapshot(store);
}
