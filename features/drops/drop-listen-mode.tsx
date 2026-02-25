"use client";

import { formatUsd } from "@/features/shared/format";
import { type Certificate, type Drop, type PurchaseReceipt, type Session } from "@/lib/domain/contracts";
import {
  getListenPlayerSnapshot,
  pauseListenPlayer,
  playListenPlayer,
  seekListenPlayer,
  setListenPlayerMuted,
  setListenPlayerVolume,
  subscribeListenPlayer,
  syncListenPlayerTrack,
  type ListenPlayerSnapshot
} from "@/lib/listen/background-player";
import {
  clearListenResumeSeconds,
  hasReachedCompletion,
  readListenResumeSeconds,
  writeListenResumeSeconds
} from "@/lib/listen/resume";
import { routes } from "@/lib/routes";
import { resolveDropPreview } from "@/lib/townhall/preview-media";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DropListenModeProps = {
  session: Session;
  drop: Drop;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

type ListenTelemetryEventType =
  | "watch_time"
  | "completion"
  | "access_start"
  | "access_complete";

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

async function postListenTelemetry(input: {
  dropId: string;
  eventType: ListenTelemetryEventType;
  watchTimeSeconds?: number;
  completionPercent?: number;
  action?: "start" | "complete" | "toggle";
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
      surface: "listen" as const,
      ...(input.action ? { action: input.action } : {})
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
    // Telemetry is best-effort only.
  }
}

export function DropListenMode({ session, drop, receipt, certificate }: DropListenModeProps) {
  const resolvedPreview = useMemo(() => resolveDropPreview(drop, "listen"), [drop]);
  const previewAsset = resolvedPreview.asset;
  const audioSource = previewAsset.type === "audio" ? previewAsset.src ?? null : null;
  const posterSource =
    previewAsset.posterSrc ??
    (previewAsset.type === "image" ? previewAsset.src ?? null : null);
  const hasAudioSource = Boolean(audioSource);

  const [playerSnapshot, setPlayerSnapshot] = useState<ListenPlayerSnapshot>(() =>
    getListenPlayerSnapshot()
  );

  const lastObservedSecondsRef = useRef<number | null>(null);
  const bufferedWatchSecondsRef = useRef(0);
  const accessStartedRef = useRef(false);
  const completionLoggedRef = useRef(false);
  const accessCompletedRef = useRef(false);

  const flushWatchTelemetry = useCallback(() => {
    const pending = Number(bufferedWatchSecondsRef.current.toFixed(2));
    if (pending <= 0) {
      return;
    }

    bufferedWatchSecondsRef.current = 0;
    void postListenTelemetry({
      dropId: drop.id,
      eventType: "watch_time",
      watchTimeSeconds: pending
    });
  }, [drop.id]);

  const markAccessStarted = useCallback(() => {
    if (accessStartedRef.current) {
      return;
    }

    accessStartedRef.current = true;
    void postListenTelemetry({
      dropId: drop.id,
      eventType: "access_start",
      action: "start"
    });
  }, [drop.id]);

  useEffect(() => subscribeListenPlayer(setPlayerSnapshot), []);

  useEffect(() => {
    lastObservedSecondsRef.current = null;
    bufferedWatchSecondsRef.current = 0;
    completionLoggedRef.current = false;
    accessCompletedRef.current = false;
    accessStartedRef.current = false;

    if (!audioSource) {
      return;
    }

    const currentSnapshot = getListenPlayerSnapshot();
    const sameTrack = currentSnapshot.dropId === drop.id && currentSnapshot.src === audioSource;

    syncListenPlayerTrack({
      dropId: drop.id,
      src: audioSource
    });

    if (!sameTrack) {
      const resumeSeconds = readListenResumeSeconds(drop.id);
      if (resumeSeconds > 0) {
        seekListenPlayer(resumeSeconds);
      }
      markAccessStarted();
      void playListenPlayer();
      return;
    }

    if (currentSnapshot.currentTime > 0) {
      accessStartedRef.current = true;
    }
  }, [audioSource, drop.id, markAccessStarted]);

  useEffect(() => {
    if (playerSnapshot.dropId !== drop.id) {
      return;
    }

    const currentSeconds = playerSnapshot.currentTime;
    const previousSeconds = lastObservedSecondsRef.current;
    const duration = playerSnapshot.duration;

    if (previousSeconds !== null) {
      const delta = currentSeconds - previousSeconds;
      if (delta > 0 && delta < 20) {
        bufferedWatchSecondsRef.current += delta;
        writeListenResumeSeconds(drop.id, currentSeconds, duration);
        if (bufferedWatchSecondsRef.current >= 10) {
          flushWatchTelemetry();
        }
      }
    }

    lastObservedSecondsRef.current = currentSeconds;

    const shouldComplete = hasReachedCompletion(currentSeconds, duration) || playerSnapshot.ended;
    if (!shouldComplete || completionLoggedRef.current) {
      return;
    }

    flushWatchTelemetry();
    clearListenResumeSeconds(drop.id);
    completionLoggedRef.current = true;

    void postListenTelemetry({
      dropId: drop.id,
      eventType: "completion",
      completionPercent: 100,
      action: "complete"
    });

    if (!accessCompletedRef.current) {
      accessCompletedRef.current = true;
      void postListenTelemetry({
        dropId: drop.id,
        eventType: "access_complete",
        completionPercent: 100,
        action: "complete"
      });
    }
  }, [
    drop.id,
    flushWatchTelemetry,
    playerSnapshot.currentTime,
    playerSnapshot.dropId,
    playerSnapshot.duration,
    playerSnapshot.ended
  ]);

  useEffect(() => {
    if (playerSnapshot.dropId !== drop.id) {
      return;
    }

    if (!playerSnapshot.isPlaying) {
      flushWatchTelemetry();
      writeListenResumeSeconds(drop.id, playerSnapshot.currentTime, playerSnapshot.duration);
    }
  }, [
    drop.id,
    flushWatchTelemetry,
    playerSnapshot.currentTime,
    playerSnapshot.dropId,
    playerSnapshot.duration,
    playerSnapshot.isPlaying
  ]);

  useEffect(
    () => () => {
      flushWatchTelemetry();
      const snapshot = getListenPlayerSnapshot();
      if (snapshot.dropId === drop.id) {
        writeListenResumeSeconds(drop.id, snapshot.currentTime, snapshot.duration);
      }
    },
    [drop.id, flushWatchTelemetry]
  );

  const progressMax = playerSnapshot.duration ?? 0;
  const progressValue = Math.min(playerSnapshot.currentTime, progressMax || 0);
  const isActiveDrop = playerSnapshot.dropId === drop.id;
  const isPlaying = isActiveDrop && playerSnapshot.isPlaying;
  const isMuted = playerSnapshot.isMuted;
  const volume = playerSnapshot.volume;

  return (
    <>
      <section className="dropmedia-stage" aria-label="listen playback stage">
        {posterSource ? (
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
          <p className="dropmedia-copy">background play stays active while you browse.</p>

          <section className="dropmedia-listen-controls" aria-label="listen controls">
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                if (!hasAudioSource) {
                  return;
                }

                if (isPlaying) {
                  pauseListenPlayer();
                  return;
                }

                markAccessStarted();
                void playListenPlayer();
              }}
              disabled={!hasAudioSource}
            >
              {isPlaying ? "pause" : "play"}
            </button>
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                if (!hasAudioSource || playerSnapshot.dropId !== drop.id) {
                  return;
                }

                const target = Math.max(0, playerSnapshot.currentTime - 15);
                seekListenPlayer(target);
                writeListenResumeSeconds(drop.id, target, playerSnapshot.duration);
                lastObservedSecondsRef.current = target;
              }}
              disabled={!hasAudioSource || playerSnapshot.dropId !== drop.id}
            >
              -15s
            </button>
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                if (!hasAudioSource || playerSnapshot.dropId !== drop.id) {
                  return;
                }

                const duration = playerSnapshot.duration ?? playerSnapshot.currentTime + 15;
                const target = Math.min(duration, playerSnapshot.currentTime + 15);
                seekListenPlayer(target);
                writeListenResumeSeconds(drop.id, target, playerSnapshot.duration);
                lastObservedSecondsRef.current = target;
              }}
              disabled={!hasAudioSource || playerSnapshot.dropId !== drop.id}
            >
              +15s
            </button>
            <button
              type="button"
              className="dropmedia-control"
              onClick={() => {
                if (!hasAudioSource) {
                  return;
                }
                setListenPlayerMuted(!isMuted);
              }}
              disabled={!hasAudioSource}
            >
              {isMuted ? "unmute" : "mute"}
            </button>
          </section>

          <label className="dropmedia-progress-label" htmlFor="dropmedia-progress">
            {formatTimeLabel(progressValue)} / {formatTimeLabel(progressMax)}
          </label>
          <input
            id="dropmedia-progress"
            className="dropmedia-progress"
            type="range"
            min={0}
            max={progressMax > 0 ? progressMax : 1}
            step={0.1}
            value={progressMax > 0 ? progressValue : 0}
            onChange={(event) => {
              if (!hasAudioSource || playerSnapshot.dropId !== drop.id) {
                return;
              }

              const target = Number(event.currentTarget.value);
              seekListenPlayer(target);
              writeListenResumeSeconds(drop.id, target, playerSnapshot.duration);
              lastObservedSecondsRef.current = target;
            }}
            disabled={!hasAudioSource || playerSnapshot.dropId !== drop.id}
          />

          <label className="dropmedia-progress-label" htmlFor="dropmedia-volume">
            volume {Math.round(volume * 100)}%
          </label>
          <input
            id="dropmedia-volume"
            className="dropmedia-progress"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => {
              if (!hasAudioSource) {
                return;
              }

              const nextVolume = Number(event.currentTarget.value);
              setListenPlayerVolume(nextVolume);
              if (isMuted && nextVolume > 0) {
                setListenPlayerMuted(false);
              }
            }}
            disabled={!hasAudioSource}
          />

          {!hasAudioSource ? (
            <p className="dropmedia-copy">listen preview source is unavailable for this drop.</p>
          ) : null}

          <div className="dropmedia-mode-row" aria-label="consume mode switcher">
            <Link href={routes.dropWatch(drop.id)} className={modeClass(false)}>
              watch
            </Link>
            <Link href={routes.dropListen(drop.id)} className={modeClass(true)}>
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

      <dl className="dropmedia-panel" aria-label="listen entitlement metadata">
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
