"use client";

import { formatUsd } from "@/features/shared/format";
import type {
  Certificate,
  Drop,
  PurchaseReceipt,
  Session,
  WatchQualityLevel,
  WatchQualityMode
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import { resolveDropPreview } from "@/lib/townhall/preview-media";
import {
  resolveHighestQualityLevel,
  resolveNextLowerQualityLevel,
  resolveWatchQualityLadder
} from "@/lib/watch/quality-ladder";
import {
  clearWatchResumeSeconds,
  hasWatchReachedCompletion,
  readWatchResumeSeconds,
  watchCompletionPercent,
  writeWatchResumeSeconds
} from "@/lib/watch/progress";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DropWatchModeProps = {
  session: Session;
  drop: Drop;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

type WatchTelemetryEventType =
  | "watch_time"
  | "completion"
  | "access_start"
  | "access_complete"
  | "quality_change"
  | "rebuffer";

type QualityChangeReason = "manual_select" | "auto_step_down_stalled" | "auto_step_down_error";
type RebufferReason = "waiting" | "stalled" | "error";

const QUALITY_OPTIONS: WatchQualityMode[] = ["auto", "high", "medium", "low"];
const REBUFFER_LOG_THROTTLE_MS = 1500;

function modeClass(active: boolean): string {
  return `dropmedia-mode-link ${active ? "active" : ""}`;
}

function formatTimeLabel(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function postWatchTelemetry(input: {
  dropId: string;
  eventType: WatchTelemetryEventType;
  watchTimeSeconds?: number;
  completionPercent?: number;
  action?: "start" | "complete" | "toggle";
  qualityMode?: WatchQualityMode;
  qualityLevel?: WatchQualityLevel;
  qualityReason?: QualityChangeReason;
  rebufferReason?: RebufferReason;
}): Promise<void> {
  const body = {
    dropId: input.dropId,
    eventType: input.eventType,
    ...(typeof input.watchTimeSeconds === "number"
      ? { watchTimeSeconds: Number(input.watchTimeSeconds.toFixed(2)) }
      : {}),
    ...(typeof input.completionPercent === "number"
      ? { completionPercent: Number(input.completionPercent.toFixed(2)) }
      : {}),
    metadata: {
      source: "drop" as const,
      surface: "watch" as const,
      ...(input.action ? { action: input.action } : {}),
      ...(input.qualityMode ? { qualityMode: input.qualityMode } : {}),
      ...(input.qualityLevel ? { qualityLevel: input.qualityLevel } : {}),
      ...(input.qualityReason ? { qualityReason: input.qualityReason } : {}),
      ...(input.rebufferReason ? { rebufferReason: input.rebufferReason } : {})
    }
  };

  try {
    await fetch("/api/v1/townhall/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      keepalive: true
    });
  } catch {
    // Telemetry is best-effort.
  }
}

export function DropWatchMode({ session, drop, receipt, certificate }: DropWatchModeProps) {
  const resolvedPreview = useMemo(() => resolveDropPreview(drop, "watch"), [drop]);
  const previewAsset = resolvedPreview.asset;
  const posterSource =
    previewAsset.posterSrc ??
    (previewAsset.type === "image" ? previewAsset.src ?? null : null);

  const qualityLadder = useMemo(() => resolveWatchQualityLadder(drop), [drop]);
  const initialAutoLevel = useMemo(
    () => resolveHighestQualityLevel(qualityLadder.availableLevels),
    [qualityLadder.availableLevels]
  );

  const [selectedQualityMode, setSelectedQualityMode] = useState<WatchQualityMode>("auto");
  const [autoQualityLevel, setAutoQualityLevel] = useState<WatchQualityLevel>(initialAutoLevel);
  const activeQualityLevel =
    selectedQualityMode === "auto" ? autoQualityLevel : selectedQualityMode;
  const activeVideoSource = qualityLadder.sourcesByLevel[activeQualityLevel];
  const hasVideoSource = Boolean(activeVideoSource);
  const qualityLabel =
    selectedQualityMode === "auto"
      ? `quality auto (${activeQualityLevel})`
      : `quality ${selectedQualityMode}`;
  const videoRenderKey = `${drop.id}:${activeQualityLevel}:${activeVideoSource ?? "none"}`;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumeRestoredRef = useRef(false);
  const accessStartedRef = useRef(false);
  const accessCompletedRef = useRef(false);
  const completionLoggedRef = useRef(false);
  const lastObservedSecondsRef = useRef<number | null>(null);
  const bufferedWatchSecondsRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const shouldAutoplayAfterQualityShiftRef = useRef(false);
  const lastRebufferAtRef = useRef(0);

  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.65);

  const flushWatchTelemetry = useCallback(() => {
    const pendingSeconds = Number(bufferedWatchSecondsRef.current.toFixed(2));
    if (pendingSeconds <= 0) {
      return;
    }

    bufferedWatchSecondsRef.current = 0;
    void postWatchTelemetry({
      dropId: drop.id,
      eventType: "watch_time",
      watchTimeSeconds: pendingSeconds
    });
  }, [drop.id]);

  const markAccessStarted = useCallback(() => {
    if (accessStartedRef.current) {
      return;
    }

    accessStartedRef.current = true;
    void postWatchTelemetry({
      dropId: drop.id,
      eventType: "access_start",
      action: "start",
      qualityMode: selectedQualityMode,
      qualityLevel: activeQualityLevel
    });
  }, [activeQualityLevel, drop.id, selectedQualityMode]);

  const markCompletion = useCallback(
    (completionPercent: number) => {
      if (completionLoggedRef.current) {
        return;
      }

      completionLoggedRef.current = true;
      flushWatchTelemetry();
      clearWatchResumeSeconds(drop.id);

      void postWatchTelemetry({
        dropId: drop.id,
        eventType: "completion",
        completionPercent,
        action: "complete",
        qualityMode: selectedQualityMode,
        qualityLevel: activeQualityLevel
      });

      if (!accessCompletedRef.current) {
        accessCompletedRef.current = true;
        void postWatchTelemetry({
          dropId: drop.id,
          eventType: "access_complete",
          completionPercent,
          action: "complete",
          qualityMode: selectedQualityMode,
          qualityLevel: activeQualityLevel
        });
      }
    },
    [activeQualityLevel, drop.id, flushWatchTelemetry, selectedQualityMode]
  );

  const emitRebufferTelemetry = useCallback(
    (rebufferReason: RebufferReason) => {
      const now = Date.now();
      if (now - lastRebufferAtRef.current < REBUFFER_LOG_THROTTLE_MS) {
        return;
      }

      lastRebufferAtRef.current = now;
      void postWatchTelemetry({
        dropId: drop.id,
        eventType: "rebuffer",
        action: "toggle",
        qualityMode: selectedQualityMode,
        qualityLevel: activeQualityLevel,
        rebufferReason
      });
    },
    [activeQualityLevel, drop.id, selectedQualityMode]
  );

  const stepDownQualityForAuto = useCallback(
    (qualityReason: Extract<QualityChangeReason, "auto_step_down_stalled" | "auto_step_down_error">) => {
      if (selectedQualityMode !== "auto") {
        return false;
      }

      const nextLevel = resolveNextLowerQualityLevel(autoQualityLevel, qualityLadder.availableLevels);
      if (!nextLevel || nextLevel === autoQualityLevel) {
        return false;
      }

      const media = videoRef.current;
      const preserveSeconds = media ? media.currentTime : readWatchResumeSeconds(drop.id);
      pendingSeekRef.current = preserveSeconds;
      shouldAutoplayAfterQualityShiftRef.current = media ? !media.paused : true;
      writeWatchResumeSeconds(drop.id, preserveSeconds, media?.duration ?? durationSeconds);

      setAutoQualityLevel(nextLevel);
      setCurrentSeconds(preserveSeconds);
      setDurationSeconds(media && Number.isFinite(media.duration) ? media.duration : durationSeconds);
      lastObservedSecondsRef.current = preserveSeconds;

      void postWatchTelemetry({
        dropId: drop.id,
        eventType: "quality_change",
        action: "toggle",
        qualityMode: "auto",
        qualityLevel: nextLevel,
        qualityReason
      });
      return true;
    },
    [
      autoQualityLevel,
      drop.id,
      durationSeconds,
      qualityLadder.availableLevels,
      selectedQualityMode
    ]
  );

  useEffect(() => {
    resumeRestoredRef.current = false;
    accessStartedRef.current = false;
    accessCompletedRef.current = false;
    completionLoggedRef.current = false;
    lastObservedSecondsRef.current = null;
    bufferedWatchSecondsRef.current = 0;
    pendingSeekRef.current = null;
    shouldAutoplayAfterQualityShiftRef.current = false;
    lastRebufferAtRef.current = 0;
    setDurationSeconds(0);
    setCurrentSeconds(0);
    setIsPlaying(false);
    setIsMuted(true);
    setVolume(0.65);
    setSelectedQualityMode("auto");
    setAutoQualityLevel(initialAutoLevel);
  }, [drop.id, initialAutoLevel]);

  useEffect(() => {
    if (selectedQualityMode !== "auto" && !qualityLadder.availableLevels.includes(selectedQualityMode)) {
      setSelectedQualityMode("auto");
    }
  }, [qualityLadder.availableLevels, selectedQualityMode]);

  useEffect(
    () => () => {
      flushWatchTelemetry();
      const media = videoRef.current;
      if (media) {
        writeWatchResumeSeconds(drop.id, media.currentTime, media.duration);
      }
    },
    [drop.id, flushWatchTelemetry]
  );

  const progressMax = durationSeconds > 0 ? durationSeconds : 1;
  const progressValue = Math.min(currentSeconds, progressMax);

  return (
    <>
      <section className="dropmedia-stage" aria-label="watch playback stage">
        {hasVideoSource ? (
          <video
            key={videoRenderKey}
            ref={videoRef}
            className="dropmedia-watch-video"
            src={activeVideoSource ?? undefined}
            poster={posterSource ?? undefined}
            muted={isMuted}
            playsInline
            autoPlay
            preload="metadata"
            onLoadedMetadata={(event) => {
              const media = event.currentTarget;
              setDurationSeconds(Number.isFinite(media.duration) ? media.duration : 0);
              setVolume(media.volume);

              if (pendingSeekRef.current !== null) {
                const seekTo = pendingSeekRef.current;
                pendingSeekRef.current = null;
                media.currentTime = seekTo;
                setCurrentSeconds(seekTo);
                lastObservedSecondsRef.current = seekTo;
              } else if (!resumeRestoredRef.current) {
                resumeRestoredRef.current = true;
                const resumeSeconds = readWatchResumeSeconds(drop.id);
                if (resumeSeconds > 0) {
                  media.currentTime = resumeSeconds;
                  setCurrentSeconds(resumeSeconds);
                  lastObservedSecondsRef.current = resumeSeconds;
                }
              }

              if (shouldAutoplayAfterQualityShiftRef.current) {
                shouldAutoplayAfterQualityShiftRef.current = false;
                markAccessStarted();
                void media.play();
              }
            }}
            onPlay={() => {
              setIsPlaying(true);
              markAccessStarted();
            }}
            onPause={(event) => {
              setIsPlaying(false);
              const media = event.currentTarget;
              setCurrentSeconds(media.currentTime);
              flushWatchTelemetry();
              writeWatchResumeSeconds(drop.id, media.currentTime, media.duration);
            }}
            onWaiting={() => {
              emitRebufferTelemetry("waiting");
              void stepDownQualityForAuto("auto_step_down_stalled");
            }}
            onStalled={() => {
              emitRebufferTelemetry("stalled");
              void stepDownQualityForAuto("auto_step_down_stalled");
            }}
            onError={() => {
              emitRebufferTelemetry("error");
              const steppedDown = stepDownQualityForAuto("auto_step_down_error");
              if (!steppedDown) {
                setIsPlaying(false);
              }
            }}
            onVolumeChange={(event) => {
              const media = event.currentTarget;
              setIsMuted(media.muted);
              setVolume(media.volume);
            }}
            onTimeUpdate={(event) => {
              const media = event.currentTarget;
              const current = media.currentTime;
              const duration = media.duration;
              setCurrentSeconds(current);
              setDurationSeconds(Number.isFinite(duration) ? duration : 0);

              const previous = lastObservedSecondsRef.current;
              if (previous !== null) {
                const delta = current - previous;
                if (delta > 0 && delta < 20) {
                  bufferedWatchSecondsRef.current += delta;
                  writeWatchResumeSeconds(drop.id, current, duration);
                  if (bufferedWatchSecondsRef.current >= 12) {
                    flushWatchTelemetry();
                  }
                }
              }
              lastObservedSecondsRef.current = current;

              if (hasWatchReachedCompletion(current, duration)) {
                markCompletion(watchCompletionPercent(current, duration));
              }
            }}
            onEnded={(event) => {
              const media = event.currentTarget;
              setIsPlaying(false);
              setCurrentSeconds(media.currentTime);
              markCompletion(100);
            }}
          />
        ) : posterSource ? (
          <div
            className="dropmedia-listen-poster"
            style={{ backgroundImage: `url(${posterSource})` }}
            aria-hidden
          />
        ) : null}

        <div className="dropmedia-backdrop" />
        <div className="dropmedia-overlay" />

        <aside className="dropmedia-social-rail" aria-label="social interactions">
          <button type="button" className="dropmedia-social-action" disabled>
            ♡
          </button>
          <button type="button" className="dropmedia-social-action" disabled>
            ◈
          </button>
          <button type="button" className="dropmedia-social-action" disabled>
            ➤
          </button>
          <button type="button" className="dropmedia-social-action" disabled>
            +
          </button>
        </aside>

        <div className="dropmedia-content">
          <p className="dropmedia-meta">@{drop.studioHandle} · {formatUsd(drop.priceUsd)}</p>
          <h1 className="dropmedia-title">{drop.title}</h1>
          <p className="dropmedia-subtitle">
            {drop.seasonLabel} · {drop.episodeLabel}
          </p>
          <p className="dropmedia-copy">{drop.synopsis}</p>
          <p className="dropmedia-copy">
            watch progress, quality fallback, and rebuffer logs are preserved for this drop.
          </p>

          <section className="dropmedia-listen-controls" aria-label="watch controls">
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                const media = videoRef.current;
                if (!media) {
                  return;
                }

                if (media.paused) {
                  markAccessStarted();
                  void media.play();
                } else {
                  media.pause();
                }
              }}
              disabled={!hasVideoSource}
            >
              {isPlaying ? "pause" : "play"}
            </button>
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                const media = videoRef.current;
                if (!media) {
                  return;
                }

                const nextSeconds = Math.max(0, media.currentTime - 10);
                media.currentTime = nextSeconds;
                setCurrentSeconds(nextSeconds);
                writeWatchResumeSeconds(drop.id, nextSeconds, media.duration);
                lastObservedSecondsRef.current = nextSeconds;
              }}
              disabled={!hasVideoSource}
            >
              -10s
            </button>
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                const media = videoRef.current;
                if (!media) {
                  return;
                }

                const nextSeconds = Math.min(
                  Number.isFinite(media.duration) ? media.duration : media.currentTime + 10,
                  media.currentTime + 10
                );
                media.currentTime = nextSeconds;
                setCurrentSeconds(nextSeconds);
                writeWatchResumeSeconds(drop.id, nextSeconds, media.duration);
                lastObservedSecondsRef.current = nextSeconds;
              }}
              disabled={!hasVideoSource}
            >
              +10s
            </button>
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                const media = videoRef.current;
                if (!media) {
                  return;
                }

                const nextMuted = !media.muted;
                media.muted = nextMuted;
                setIsMuted(nextMuted);
              }}
              disabled={!hasVideoSource}
            >
              {isMuted ? "unmute" : "mute"}
            </button>
          </section>

          <label className="dropmedia-progress-label" htmlFor="dropmedia-watch-progress">
            {formatTimeLabel(progressValue)} / {formatTimeLabel(durationSeconds)}
          </label>
          <input
            id="dropmedia-watch-progress"
            className="dropmedia-progress"
            type="range"
            min={0}
            max={progressMax}
            step={0.1}
            value={progressValue}
            onChange={(event) => {
              const media = videoRef.current;
              if (!media) {
                return;
              }

              const nextSeconds = Number(event.currentTarget.value);
              media.currentTime = nextSeconds;
              setCurrentSeconds(nextSeconds);
              writeWatchResumeSeconds(drop.id, nextSeconds, media.duration);
              lastObservedSecondsRef.current = nextSeconds;
            }}
            disabled={!hasVideoSource}
          />

          <label className="dropmedia-progress-label" htmlFor="dropmedia-watch-volume">
            volume {Math.round(volume * 100)}%
          </label>
          <input
            id="dropmedia-watch-volume"
            className="dropmedia-progress"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => {
              const media = videoRef.current;
              if (!media) {
                return;
              }

              const nextVolume = Number(event.currentTarget.value);
              media.volume = nextVolume;
              media.muted = nextVolume <= 0;
              setVolume(nextVolume);
              setIsMuted(media.muted);
            }}
            disabled={!hasVideoSource}
          />

          <p className="dropmedia-progress-label">{qualityLabel}</p>
          <section className="dropmedia-quality-controls" aria-label="watch quality controls">
            {QUALITY_OPTIONS.map((qualityMode) => {
              const isAvailable =
                qualityMode === "auto" || qualityLadder.availableLevels.includes(qualityMode);
              const isActive = selectedQualityMode === qualityMode;

              return (
                <button
                  key={qualityMode}
                  type="button"
                  className={`dropmedia-control ${isActive ? "active" : ""}`}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable || selectedQualityMode === qualityMode) {
                      return;
                    }

                    const media = videoRef.current;
                    const preserveSeconds = media ? media.currentTime : readWatchResumeSeconds(drop.id);
                    pendingSeekRef.current = preserveSeconds;
                    shouldAutoplayAfterQualityShiftRef.current = media ? !media.paused : true;
                    writeWatchResumeSeconds(
                      drop.id,
                      preserveSeconds,
                      media?.duration ?? durationSeconds
                    );
                    setCurrentSeconds(preserveSeconds);
                    lastObservedSecondsRef.current = preserveSeconds;

                    if (qualityMode === "auto") {
                      setAutoQualityLevel(resolveHighestQualityLevel(qualityLadder.availableLevels));
                    }

                    setSelectedQualityMode(qualityMode);
                    void postWatchTelemetry({
                      dropId: drop.id,
                      eventType: "quality_change",
                      action: "toggle",
                      qualityMode,
                      qualityLevel:
                        qualityMode === "auto"
                          ? resolveHighestQualityLevel(qualityLadder.availableLevels)
                          : qualityMode,
                      qualityReason: "manual_select"
                    });
                  }}
                >
                  {qualityMode}
                </button>
              );
            })}
          </section>

          {!hasVideoSource ? (
            <p className="dropmedia-copy">watch preview source is unavailable for this drop.</p>
          ) : null}

          <div className="dropmedia-mode-row" aria-label="consume mode switcher">
            <Link href={routes.dropWatch(drop.id)} className={modeClass(true)}>
              watch
            </Link>
            <Link href={routes.dropListen(drop.id)} className={modeClass(false)}>
              listen
            </Link>
            <Link href={routes.dropRead(drop.id)} className={modeClass(false)}>
              read
            </Link>
            <Link href={routes.dropPhotos(drop.id)} className={modeClass(false)}>
              photos
            </Link>
          </div>

          <div className="dropmedia-actions">
            <Link href={routes.myCollection()} className="dropmedia-secondary-cta">
              my collection
            </Link>
            {certificate ? (
              <Link href={routes.certificate(certificate.id)} className="dropmedia-secondary-cta">
                certificate
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <dl className="dropmedia-panel" aria-label="watch entitlement metadata">
        <div>
          <dt>world</dt>
          <dd>{drop.worldLabel}</dd>
        </div>
        <div>
          <dt>receipt</dt>
          <dd>{receipt?.id ?? "n/a"}</dd>
        </div>
        <div>
          <dt>certificate</dt>
          <dd>{certificate?.id ?? "n/a"}</dd>
        </div>
        <div>
          <dt>session</dt>
          <dd>@{session.handle}</dd>
        </div>
      </dl>
    </>
  );
}
