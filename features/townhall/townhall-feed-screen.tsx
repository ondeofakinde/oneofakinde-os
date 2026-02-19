"use client";

import { formatUsd } from "@/features/shared/format";
import type { Drop } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TownhallBottomNav } from "./townhall-bottom-nav";
import {
  BookmarkIcon,
  BookIcon,
  CameraIcon,
  CommentIcon,
  DiamondIcon,
  FilmIcon,
  HeadphonesIcon,
  HeartIcon,
  PlusIcon,
  RadioIcon,
  SearchIcon,
  SendIcon
} from "./townhall-icons";

type TownhallMode = "watch" | "listen" | "read" | "gallery" | "live";

type TownhallFeedScreenProps = {
  mode: TownhallMode;
  viewer: {
    accountId: string;
    handle: string;
  } | null;
  drops: Drop[];
  ownedDropIds?: string[];
  isTownhallHome?: boolean;
};

type TownhallComment = {
  id: string;
  author: string;
  body: string;
  publishedAt: string;
};

type TownhallPanel = "comments" | "collect" | "share";

type StageTapEvent =
  | React.MouseEvent<HTMLElement>
  | React.PointerEvent<HTMLElement>
  | React.TouchEvent<HTMLElement>;
type StageTapSource = "pointer" | "click";

type CollectStats = {
  collectors: number;
  royaltyPercent: number | null;
  floorUsd: number;
  volumeUsd: number;
};

type ModeCopy = {
  kicker: string;
  unlockCta: string;
};

const DEFAULT_PREVIEW_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const MODE_COPY: Record<TownhallMode, ModeCopy> = {
  watch: {
    kicker: "video community hub",
    unlockCta: "unlock watch"
  },
  listen: {
    kicker: "audio community hub",
    unlockCta: "unlock listen"
  },
  read: {
    kicker: "text community hub",
    unlockCta: "unlock read"
  },
  gallery: {
    kicker: "still-image community hub",
    unlockCta: "unlock gallery"
  },
  live: {
    kicker: "live community hub",
    unlockCta: "unlock live"
  }
};

function modeHref(mode: TownhallMode, dropId: string): ReturnType<typeof routes.dropWatch> {
  if (mode === "watch") return routes.dropWatch(dropId);
  if (mode === "listen") return routes.dropListen(dropId);
  if (mode === "read") return routes.dropRead(dropId);
  if (mode === "gallery") return routes.dropPhotos(dropId);
  return routes.dropWatch(dropId);
}

function modeIcon(mode: TownhallMode) {
  if (mode === "listen") return <HeadphonesIcon className="townhall-open-drop-glyph" />;
  if (mode === "read") return <BookIcon className="townhall-open-drop-glyph" />;
  if (mode === "gallery") return <CameraIcon className="townhall-open-drop-glyph" />;
  if (mode === "live") return <RadioIcon className="townhall-open-drop-glyph" />;
  return <FilmIcon className="townhall-open-drop-glyph" />;
}

function modeNav(mode: TownhallMode, isTownhallHome: boolean): Parameters<typeof TownhallBottomNav>[0]["activeMode"] {
  if (isTownhallHome) return "townhall";
  if (mode === "watch") return "watch";
  if (mode === "listen") return "listen";
  if (mode === "read") return "read";
  if (mode === "gallery") return "gallery";
  return "live";
}

function formatPublishedDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function baseLikeCount(index: number): number {
  return 1200 + index * 93;
}

function baseShareCount(index: number): number {
  return 70 + index * 11;
}

function buildCollectStats(drop: Drop, index: number): CollectStats {
  return {
    collectors: 140 + index * 37,
    royaltyPercent: index % 3 === 1 ? null : 8 + index * 2,
    floorUsd: Number(Math.max(0.99, drop.priceUsd - 0.72).toFixed(2)),
    volumeUsd: Number((drop.priceUsd * (220 + index * 36)).toFixed(2))
  };
}

function createInitialComments(drops: Drop[]): Record<string, TownhallComment[]> {
  const output: Record<string, TownhallComment[]> = {};

  for (const [index, drop] of drops.entries()) {
    output[drop.id] = [
      {
        id: `${drop.id}-c1`,
        author: "community",
        body: `this ${drop.title} drop hits hard.`,
        publishedAt: `${index + 1}h`
      },
      {
        id: `${drop.id}-c2`,
        author: "collector",
        body: "sound and pacing are both clean.",
        publishedAt: `${index + 2}h`
      }
    ];
  }

  return output;
}

function upsertCommentMap(
  existing: Record<string, TownhallComment[]>,
  drops: Drop[]
): Record<string, TownhallComment[]> {
  const next: Record<string, TownhallComment[]> = { ...existing };

  for (const drop of drops) {
    if (!next[drop.id]) {
      next[drop.id] = [];
    }
  }

  return next;
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

export function TownhallFeedScreen({
  mode,
  viewer,
  drops,
  ownedDropIds = [],
  isTownhallHome = false
}: TownhallFeedScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedDropIds, setLikedDropIds] = useState<string[]>([]);
  const [savedDropIds, setSavedDropIds] = useState<string[]>([]);
  const [openPanel, setOpenPanel] = useState<TownhallPanel | null>(null);
  const [panelDropId, setPanelDropId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [shareOrigin, setShareOrigin] = useState("https://oneofakinde-os.vercel.app");
  const [failedVideoDropIds, setFailedVideoDropIds] = useState<string[]>([]);
  const [commentsByDrop, setCommentsByDrop] = useState<Record<string, TownhallComment[]>>(
    () => createInitialComments(drops)
  );

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const lastScrollTopRef = useRef(0);
  const lastImmersiveEnterMsRef = useRef(0);
  const lastStageTapMsRef = useRef(0);
  const lastStagePointerTapMsRef = useRef(0);

  const likedSet = useMemo(() => new Set(likedDropIds), [likedDropIds]);
  const savedSet = useMemo(() => new Set(savedDropIds), [savedDropIds]);
  const failedVideoSet = useMemo(() => new Set(failedVideoDropIds), [failedVideoDropIds]);
  const ownedSet = useMemo(() => new Set(ownedDropIds), [ownedDropIds]);

  const activeDrop = drops[activeIndex] ?? drops[0] ?? null;
  const copy = MODE_COPY[mode];

  useEffect(() => {
    setCommentsByDrop((current) => upsertCommentMap(current, drops));
  }, [drops]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) {
      return;
    }

    lastScrollTopRef.current = root.scrollTop;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = activeIndex;
        let bestRatio = 0;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const index = Number(target.dataset.index ?? -1);

          if (Number.isNaN(index) || index < 0) continue;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        }

        if (bestRatio >= 0.55) {
          setActiveIndex(bestIndex);
        }
      },
      {
        root,
        threshold: [0.45, 0.55, 0.7, 0.85]
      }
    );

    for (const element of itemRefs.current) {
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [activeIndex, drops.length]);

  useEffect(() => {
    setIsImmersive(false);
    setShowControls(false);
    setOpenPanel(null);
    setPanelDropId(null);
    setCommentDraft("");
    setShareNotice("");
    setIsPlaying(true);
  }, [activeIndex]);

  useEffect(() => {
    for (const [index, video] of videoRefs.current.entries()) {
      if (!video) continue;

      video.muted = isMuted;
      video.volume = isMuted ? 0 : volume;

      if (index === activeIndex && isPlaying) {
        void video.play().catch(() => undefined);
        continue;
      }

      video.pause();
    }
  }, [activeIndex, isMuted, volume, isPlaying]);

  if (!activeDrop) {
    return (
      <main className="townhall-page">
        <section className="townhall-phone-shell townhall-empty">
          <p className="townhall-brand">oneofakinde</p>
          <h1>townhall</h1>
          <p>no drops are available yet.</p>
        </section>
      </main>
    );
  }

  function togglePanel(panel: TownhallPanel, dropId: string) {
    if (openPanel === panel && panelDropId === dropId) {
      setOpenPanel(null);
      setPanelDropId(null);
      return;
    }

    setIsImmersive(false);
    setShowControls(false);
    setOpenPanel(panel);
    setPanelDropId(dropId);
    setShareNotice("");
  }

  function handleStageTap(event: StageTapEvent, index: number, source: StageTapSource) {
    const now = Date.now();
    if (source === "click" && now - lastStagePointerTapMsRef.current < 700) {
      // Ignore synthetic click that follows a touch/pointer tap.
      return;
    }
    if (source === "pointer") {
      lastStagePointerTapMsRef.current = now;
    }
    if (now - lastStageTapMsRef.current < 180) {
      return;
    }
    lastStageTapMsRef.current = now;

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    // Keep explicit no-toggle controls interactive (social rail, overlay panels, etc).
    if (target.closest("[data-no-immersive-toggle='true']")) {
      return;
    }

    if (index !== activeIndex) {
      itemRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const isActionTarget = Boolean(target.closest("a,button,input,textarea,label,select"));

    if (!isImmersive) {
      // First tap should always enter immersive preview, even if it lands on CTA chrome.
      if (isActionTarget) {
        event.preventDefault();
        event.stopPropagation();
      }

      setIsImmersive(true);
      setShowControls(false);
      setOpenPanel(null);
      setPanelDropId(null);
      lastImmersiveEnterMsRef.current = Date.now();
      const root = viewportRef.current;
      if (root) {
        lastScrollTopRef.current = root.scrollTop;
      }
      return;
    }

    setIsImmersive(false);
    setShowControls(false);
  }

  function handleFeedScroll() {
    if (!isImmersive && !showControls) {
      return;
    }

    const root = viewportRef.current;
    if (!root) {
      return;
    }

    const nextScrollTop = root.scrollTop;
    const delta = Math.abs(nextScrollTop - lastScrollTopRef.current);
    lastScrollTopRef.current = nextScrollTop;

    // Avoid accidental exit from tiny inertial/jitter scroll events right after entering immersive mode.
    if (Date.now() - lastImmersiveEnterMsRef.current < 280 || delta < 14) {
      return;
    }

    setIsImmersive(false);
    setShowControls(false);
  }

  function activeShareUrl(dropId: string): string {
    return `${shareOrigin}${routes.drop(dropId)}`;
  }

  function handleCommentSubmit(dropId: string) {
    const body = commentDraft.trim();
    if (!body) return;

    setCommentsByDrop((current) => {
      const previous = current[dropId] ?? [];
      const author = viewer?.handle ?? "guest";
      const nextComment: TownhallComment = {
        id: `${dropId}-${Date.now()}`,
        author,
        body,
        publishedAt: "now"
      };

      return {
        ...current,
        [dropId]: [...previous, nextComment]
      };
    });

    setCommentDraft("");
  }

  function handleCopyForInternalDm(dropId: string) {
    const url = activeShareUrl(dropId);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }

    setShareNotice("saved for internal dm delivery (mock).");
  }

  return (
    <main className="townhall-page">
      <section className={`townhall-phone-shell townhall-phone-shell-feed ${isImmersive ? "immersive" : ""}`} aria-label="townhall feed shell">
        <header className="townhall-header townhall-header-feed">
          <Link href={routes.studio(activeDrop.studioHandle)} className="townhall-avatar-link" aria-label="open creator studio">
            <span>{activeDrop.studioHandle.slice(0, 1).toUpperCase()}</span>
          </Link>
          <p className="townhall-brand">oneofakinde</p>
          <Link
            href={viewer ? routes.create() : routes.signIn(routes.create())}
            className="townhall-icon-link"
            aria-label="create drop"
            data-no-immersive-toggle="true"
          >
            <PlusIcon className="townhall-ui-icon" />
          </Link>
          <form
            action={routes.townhallSearch()}
            method="get"
            className="townhall-search-form townhall-search-form-feed"
            role="search"
            aria-label="search oneofakinde"
            data-no-immersive-toggle="true"
          >
            <SearchIcon className="townhall-search-inline-icon" />
            <input
              type="search"
              name="q"
              className="townhall-search-input"
              placeholder="search users, worlds, and drops"
              aria-label="search users, worlds, and drops"
            />
          </form>
        </header>

        <div className="townhall-feed-viewport" ref={viewportRef} onScroll={handleFeedScroll}>
          {drops.map((drop, index) => {
            const isActive = index === activeIndex;
            const isPaywalled = !ownedSet.has(drop.id);
            const openCurrentPanel = isActive && panelDropId === drop.id ? openPanel : null;
            const comments = commentsByDrop[drop.id] ?? [];
            const collectStats = buildCollectStats(drop, index);
            const likeCount = baseLikeCount(index) + (likedSet.has(drop.id) ? 1 : 0);
            const shareCount = baseShareCount(index);
            const isLiked = likedSet.has(drop.id);
            const isSaved = savedSet.has(drop.id);
            const dropHeading = drop.seasonLabel.trim();
            const dropSubtitle = drop.episodeLabel.trim();
            const mediaTarget = modeHref(mode, drop.id);
            const mediaHref = viewer ? mediaTarget : routes.signIn(mediaTarget);
            const paywallHref = viewer ? routes.buyDrop(drop.id) : routes.signIn(routes.buyDrop(drop.id));
            const shareUrl = activeShareUrl(drop.id);
            const shareText = `${drop.title} on oneofakinde ${shareUrl}`;

            return (
              <article
                key={drop.id}
                className={`townhall-feed-item ${isActive ? "active" : ""}`}
                data-index={index}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
              >
                <section
                  className="townhall-stage"
                  aria-label={`${drop.title} preview`}
                  onPointerUpCapture={(event) => handleStageTap(event, index, "pointer")}
                  onClickCapture={(event) => handleStageTap(event, index, "click")}
                >
                  {failedVideoSet.has(drop.id) ? (
                    <div className="townhall-backdrop" />
                  ) : (
                    <video
                      ref={(element) => {
                        videoRefs.current[index] = element;
                      }}
                      className="townhall-preview-video"
                      src={DEFAULT_PREVIEW_URL}
                      preload="metadata"
                      loop
                      playsInline
                      muted
                      onError={() => {
                        setFailedVideoDropIds((current) =>
                          current.includes(drop.id) ? current : [...current, drop.id]
                        );
                      }}
                    />
                  )}

                  <div className="townhall-overlay" />

                  <div className="townhall-content">
                    <p className="townhall-kicker">{copy.kicker}</p>
                    <p className="townhall-meta">
                      @{drop.studioHandle} · {formatUsd(drop.priceUsd)}
                    </p>
                    <h1 className="townhall-title">{drop.title}</h1>
                    {dropHeading ? <p className="townhall-subtitle">{dropHeading}</p> : null}
                    {dropSubtitle ? <p className="townhall-subtitle secondary">{dropSubtitle}</p> : null}
                    {drop.synopsis.trim() ? <p className="townhall-synopsis">{drop.synopsis}</p> : null}
                    <p className="townhall-meta">{formatPublishedDate(drop.releaseDate)}</p>

                    {isPaywalled ? (
                      <div className="townhall-cta-row">
                        <Link href={paywallHref} className="townhall-primary-cta">
                          {copy.unlockCta}
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  <aside className="townhall-social-rail" aria-label="social interactions" data-no-immersive-toggle="true">
                    <button
                      type="button"
                      className={`townhall-social-action ${isLiked ? "active" : ""}`}
                      onClick={() => {
                        setLikedDropIds((current) => toggleId(current, drop.id));
                      }}
                      aria-label="like drop"
                    >
                      <HeartIcon className="townhall-social-icon" filled={isLiked} />
                      <small>{likeCount.toLocaleString()}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${openCurrentPanel === "comments" ? "active" : ""}`}
                      onClick={() => togglePanel("comments", drop.id)}
                      aria-label="open comments"
                    >
                      <CommentIcon className="townhall-social-icon" filled={openCurrentPanel === "comments"} />
                      <small>{comments.length}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${openCurrentPanel === "collect" ? "active" : ""}`}
                      onClick={() => togglePanel("collect", drop.id)}
                      aria-label="collect drop details"
                    >
                      <DiamondIcon className="townhall-social-icon" filled={openCurrentPanel === "collect"} />
                      <small>{collectStats.collectors}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${openCurrentPanel === "share" ? "active" : ""}`}
                      onClick={() => togglePanel("share", drop.id)}
                      aria-label="share drop"
                    >
                      <SendIcon className="townhall-social-icon" filled={openCurrentPanel === "share"} />
                      <small>{shareCount}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${isSaved ? "active" : ""}`}
                      onClick={() => {
                        setSavedDropIds((current) => toggleId(current, drop.id));
                      }}
                      aria-label="save drop to private library"
                    >
                      <BookmarkIcon className="townhall-social-icon" filled={isSaved} />
                      <small>{isSaved ? "saved" : "save"}</small>
                    </button>
                  </aside>

                  {isActive && showControls ? (
                    <section className="townhall-media-controls" aria-label="media controls" data-no-immersive-toggle="true">
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => setIsMuted((current) => !current)}
                      >
                        {isMuted ? "unmute" : "mute"}
                      </button>
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => setIsPlaying((current) => !current)}
                      >
                        {isPlaying ? "pause" : "play"}
                      </button>
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => {
                          const video = videoRefs.current[activeIndex];
                          if (!video) return;
                          video.currentTime = Math.max(0, video.currentTime - 10);
                        }}
                      >
                        -10s
                      </button>
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => {
                          const video = videoRefs.current[activeIndex];
                          if (!video) return;
                          const duration = Number.isFinite(video.duration) ? video.duration : video.currentTime + 10;
                          video.currentTime = Math.min(duration, video.currentTime + 10);
                        }}
                      >
                        +10s
                      </button>
                      <label className="townhall-volume-control">
                        volume
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(event) => {
                            const nextVolume = Number(event.target.value);
                            setVolume(nextVolume);
                            setIsMuted(nextVolume === 0);
                          }}
                        />
                      </label>
                      <button type="button" className="townhall-control-button" onClick={() => setShowControls(false)}>
                        hide
                      </button>
                    </section>
                  ) : null}

                  {isActive && openCurrentPanel === "comments" ? (
                    <section className="townhall-overlay-panel" aria-label="drop comments" data-no-immersive-toggle="true">
                      <div className="townhall-overlay-head">
                        <h2>comments</h2>
                        <button type="button" onClick={() => setOpenPanel(null)} aria-label="close comments">
                          close
                        </button>
                      </div>
                      <ul className="townhall-comment-list">
                        {comments.map((comment) => (
                          <li key={comment.id}>
                            <p>
                              <strong>@{comment.author}</strong> · {comment.publishedAt}
                            </p>
                            <p>{comment.body}</p>
                          </li>
                        ))}
                      </ul>
                      <div className="townhall-comment-form">
                        <input
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="write a comment"
                          aria-label="write comment"
                        />
                        <button type="button" onClick={() => handleCommentSubmit(drop.id)}>
                          send
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {isActive && openCurrentPanel === "collect" ? (
                    <section className="townhall-overlay-panel" aria-label="collect drop details" data-no-immersive-toggle="true">
                      <div className="townhall-overlay-head">
                        <h2>collect drop</h2>
                        <button type="button" onClick={() => setOpenPanel(null)} aria-label="close collect details">
                          close
                        </button>
                      </div>
                      <dl className="townhall-collect-stats">
                        <div>
                          <dt>price</dt>
                          <dd>{formatUsd(drop.priceUsd)}</dd>
                        </div>
                        <div>
                          <dt>artist royalty</dt>
                          <dd>{collectStats.royaltyPercent === null ? "n/a" : `${collectStats.royaltyPercent}%`}</dd>
                        </div>
                        <div>
                          <dt># collectors</dt>
                          <dd>{collectStats.collectors}</dd>
                        </div>
                        <div>
                          <dt>floor</dt>
                          <dd>{formatUsd(collectStats.floorUsd)}</dd>
                        </div>
                        <div>
                          <dt>volume</dt>
                          <dd>{formatUsd(collectStats.volumeUsd)}</dd>
                        </div>
                      </dl>
                      <div className="townhall-overlay-actions">
                        <Link href={routes.drop(drop.id)}>open drop</Link>
                        <Link href={paywallHref}>collect</Link>
                      </div>
                    </section>
                  ) : null}

                  {isActive && openCurrentPanel === "share" ? (
                    <section className="townhall-overlay-panel" aria-label="share drop" data-no-immersive-toggle="true">
                      <div className="townhall-overlay-head">
                        <h2>send drop</h2>
                        <button type="button" onClick={() => setOpenPanel(null)} aria-label="close share panel">
                          close
                        </button>
                      </div>
                      <div className="townhall-share-grid">
                        <a href={`sms:?body=${encodeURIComponent(shareText)}`}>sms</a>
                        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
                          whatsapp
                        </a>
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                            drop.title
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          telegram
                        </a>
                        <button type="button" onClick={() => handleCopyForInternalDm(drop.id)}>
                          internal dm
                        </button>
                      </div>
                      {shareNotice ? <p className="townhall-share-note">{shareNotice}</p> : null}
                    </section>
                  ) : null}

                  {isActive && !isPaywalled ? (
                    <Link href={mediaHref} className="townhall-open-drop-link" data-no-immersive-toggle="true">
                      {modeIcon(mode)}
                    </Link>
                  ) : null}
                </section>
              </article>
            );
          })}
        </div>

        <TownhallBottomNav activeMode={modeNav(mode, isTownhallHome)} noImmersiveToggle />
      </section>

      <aside className="townhall-side-notes" aria-label="townhall concept notes">
        <h2>townhall shell</h2>
        <p>smooth snap feed with one drop at a time, autoplay preview, and tap-to-immerse behavior.</p>
        <p>social lane now supports like, comments, collect, send, and save-to-private-library interactions.</p>
      </aside>
    </main>
  );
}
