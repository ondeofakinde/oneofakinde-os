"use client";

import { formatUsd } from "@/features/shared/format";
import { type Certificate, type Drop, type PurchaseReceipt, type Session } from "@/lib/domain/contracts";
import {
  clearReadProgress,
  hasReadReachedCompletion,
  readReadProgress,
  writeReadProgress
} from "@/lib/read/progress";
import { routes } from "@/lib/routes";
import { resolveDropPreview } from "@/lib/townhall/preview-media";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DropReadModeProps = {
  session: Session;
  drop: Drop;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

type ReadTelemetryEventType =
  | "drop_dwell_time"
  | "completion"
  | "access_start"
  | "access_complete";

type ReadSection = {
  id: string;
  title: string;
  body: string;
};

const DWELL_FLUSH_INTERVAL_MS = 12_000;

function modeClass(active: boolean): string {
  return `dropmedia-mode-link ${active ? "active" : ""}`;
}

function safeSectionId(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "section";
}

function normalizeReadParagraphs(input: string): string[] {
  const paragraphLike = input
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphLike.length > 0) {
    return paragraphLike;
  }

  return ["read mode is active for this drop."];
}

function buildReadSections(drop: Drop): ReadSection[] {
  const previewAsset = resolveDropPreview(drop, "read").asset;
  const previewText = previewAsset.type === "text" ? previewAsset.text?.trim() || "" : "";
  const synopsis = drop.synopsis.trim();

  const combined = [previewText, synopsis].filter(Boolean).join(" ");
  const chunks = normalizeReadParagraphs(combined);

  const sectionA = chunks.slice(0, Math.max(1, Math.ceil(chunks.length / 3))).join(" ");
  const sectionB = chunks.slice(Math.ceil(chunks.length / 3), Math.ceil((chunks.length * 2) / 3)).join(" ");
  const sectionC = chunks.slice(Math.ceil((chunks.length * 2) / 3)).join(" ");

  const sectionSeeds: Array<{ title: string; body: string }> = [
    {
      title: "overview",
      body: sectionA || synopsis || `${drop.title} opens this chapter.`
    },
    {
      title: `${drop.seasonLabel} · ${drop.episodeLabel}`,
      body: sectionB || sectionA || "chapter context is loading."
    },
    {
      title: `${drop.worldLabel} notes`,
      body: sectionC || synopsis || "world notes are part of the reading path."
    }
  ];

  return sectionSeeds.map((section, index) => ({
    id: `${safeSectionId(section.title)}-${index + 1}`,
    title: section.title,
    body: section.body
  }));
}

async function postReadTelemetry(input: {
  dropId: string;
  eventType: ReadTelemetryEventType;
  watchTimeSeconds?: number;
  completionPercent?: number;
  action?: "start" | "complete" | "toggle";
  position?: number;
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
      surface: "read" as const,
      ...(typeof input.position === "number" ? { position: input.position } : {}),
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

export function DropReadMode({ session, drop, receipt, certificate }: DropReadModeProps) {
  const sections = useMemo(() => buildReadSections(drop), [drop]);
  const previewAsset = useMemo(() => resolveDropPreview(drop, "read").asset, [drop]);

  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? "overview-1");
  const [progressPercent, setProgressPercent] = useState(0);
  const [completionLogged, setCompletionLogged] = useState(false);

  const articleRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const dwellMsBufferRef = useRef(0);
  const dwellLastTickRef = useRef(0);
  const accessStartedRef = useRef(false);
  const accessCompletedRef = useRef(false);

  const flushDwellTelemetry = useCallback(() => {
    const seconds = Number((dwellMsBufferRef.current / 1000).toFixed(2));
    if (seconds <= 0) {
      return;
    }

    dwellMsBufferRef.current = 0;
    void postReadTelemetry({
      dropId: drop.id,
      eventType: "drop_dwell_time",
      watchTimeSeconds: seconds
    });
  }, [drop.id]);

  const calculateProgressPercent = useCallback((target: HTMLElement): number => {
    const maxScrollable = Math.max(1, target.scrollHeight - target.clientHeight);
    const rawPercent = (target.scrollTop / maxScrollable) * 100;
    return Math.min(100, Math.max(0, Number(rawPercent.toFixed(2))));
  }, []);

  const resolveActiveSectionFromScroll = useCallback((): string => {
    const article = articleRef.current;
    if (!article) {
      return sections[0]?.id ?? activeSectionId;
    }

    const marker = article.scrollTop + 24;
    let nextActive = sections[0]?.id ?? activeSectionId;
    for (const section of sections) {
      const node = sectionRefs.current[section.id];
      if (!node) {
        continue;
      }

      if (node.offsetTop <= marker) {
        nextActive = section.id;
      }
    }

    return nextActive;
  }, [activeSectionId, sections]);

  const persistReadProgress = useCallback(
    (percent: number, sectionId: string) => {
      if (hasReadReachedCompletion(percent)) {
        clearReadProgress(drop.id);
        return;
      }

      writeReadProgress(drop.id, {
        percent,
        lastSectionId: sectionId
      });
    },
    [drop.id]
  );

  const completeReadProgress = useCallback(
    (sectionId: string, percent: number) => {
      if (completionLogged) {
        return;
      }

      setCompletionLogged(true);
      flushDwellTelemetry();
      clearReadProgress(drop.id);

      void postReadTelemetry({
        dropId: drop.id,
        eventType: "completion",
        completionPercent: 100,
        action: "complete",
        position: sections.findIndex((section) => section.id === sectionId) + 1
      });

      if (!accessCompletedRef.current) {
        accessCompletedRef.current = true;
        void postReadTelemetry({
          dropId: drop.id,
          eventType: "access_complete",
          completionPercent: 100,
          action: "complete",
          position: sections.findIndex((section) => section.id === sectionId) + 1
        });
      }

      setProgressPercent(Math.max(percent, 100));
    },
    [completionLogged, drop.id, flushDwellTelemetry, sections]
  );

  const onArticleScroll = useCallback(() => {
    const article = articleRef.current;
    if (!article) {
      return;
    }

    const percent = calculateProgressPercent(article);
    const sectionId = resolveActiveSectionFromScroll();
    setProgressPercent(percent);
    setActiveSectionId(sectionId);
    persistReadProgress(percent, sectionId);

    if (hasReadReachedCompletion(percent)) {
      completeReadProgress(sectionId, percent);
    }
  }, [
    calculateProgressPercent,
    completeReadProgress,
    persistReadProgress,
    resolveActiveSectionFromScroll
  ]);

  useEffect(() => {
    const saved = readReadProgress(drop.id);
    const initialSectionId =
      saved.lastSectionId && sections.some((section) => section.id === saved.lastSectionId)
        ? saved.lastSectionId
        : sections[0]?.id ?? "overview-1";

    setActiveSectionId(initialSectionId);
    setProgressPercent(saved.percent);
    setCompletionLogged(false);
    accessCompletedRef.current = false;
    accessStartedRef.current = false;
    dwellMsBufferRef.current = 0;
    dwellLastTickRef.current = Date.now();

    const startPosition = sections.findIndex((section) => section.id === initialSectionId) + 1;
    if (!accessStartedRef.current) {
      accessStartedRef.current = true;
      void postReadTelemetry({
        dropId: drop.id,
        eventType: "access_start",
        action: "start",
        position: startPosition
      });
    }

    const sectionNode = sectionRefs.current[initialSectionId];
    if (sectionNode) {
      sectionNode.scrollIntoView({ block: "start" });
    } else if (articleRef.current && saved.percent > 0) {
      const article = articleRef.current;
      const maxScrollable = Math.max(1, article.scrollHeight - article.clientHeight);
      article.scrollTop = (saved.percent / 100) * maxScrollable;
    }
  }, [drop.id, sections]);

  useEffect(() => {
    const ticker = window.setInterval(() => {
      const now = Date.now();
      const delta = now - dwellLastTickRef.current;
      dwellLastTickRef.current = now;
      if (delta <= 0 || document.visibilityState !== "visible") {
        return;
      }

      dwellMsBufferRef.current += delta;
      if (dwellMsBufferRef.current >= DWELL_FLUSH_INTERVAL_MS) {
        flushDwellTelemetry();
      }
    }, 1000);

    return () => {
      window.clearInterval(ticker);
    };
  }, [flushDwellTelemetry]);

  useEffect(
    () => () => {
      flushDwellTelemetry();
      persistReadProgress(progressPercent, activeSectionId);
    },
    [activeSectionId, flushDwellTelemetry, persistReadProgress, progressPercent]
  );

  const activeIndex = Math.max(0, sections.findIndex((section) => section.id === activeSectionId));

  return (
    <>
      <section className="dropmedia-stage dropmedia-read-stage" aria-label="read stage">
        <div className="dropmedia-backdrop" />
        <div className="dropmedia-overlay" />

        <div className="dropmedia-content dropmedia-read-content">
          <p className="dropmedia-meta">@{drop.studioHandle} · {formatUsd(drop.priceUsd)}</p>
          <h1 className="dropmedia-title">{drop.title}</h1>
          <p className="dropmedia-subtitle">
            {drop.seasonLabel} · {drop.episodeLabel}
          </p>
          {previewAsset.type === "text" && previewAsset.text ? (
            <p className="dropmedia-copy">{previewAsset.text}</p>
          ) : (
            <p className="dropmedia-copy">{drop.synopsis}</p>
          )}

          <div className="dropmedia-read-progress-head">
            <span>read progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="dropmedia-read-progress-track" role="presentation">
            <span style={{ width: `${Math.max(2, progressPercent)}%` }} />
          </div>

          <div className="dropmedia-read-layout">
            <nav className="dropmedia-read-toc" aria-label="table of contents">
              <p>table of contents</p>
              <ol>
                {sections.map((section, index) => {
                  const isActive = section.id === activeSectionId;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        className={isActive ? "active" : ""}
                        onClick={() => {
                          const node = sectionRefs.current[section.id];
                          if (!node) {
                            return;
                          }

                          node.scrollIntoView({ behavior: "smooth", block: "start" });
                          setActiveSectionId(section.id);
                          void postReadTelemetry({
                            dropId: drop.id,
                            eventType: "access_start",
                            action: "toggle",
                            position: index + 1
                          });
                        }}
                      >
                        {index + 1}. {section.title}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <article
              ref={articleRef}
              className="dropmedia-read-article"
              aria-label="read content"
              onScroll={onArticleScroll}
            >
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={(node) => {
                    sectionRefs.current[section.id] = node;
                  }}
                  className="dropmedia-read-section"
                >
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </section>
              ))}
            </article>
          </div>

          <div className="dropmedia-mode-row" aria-label="consume mode switcher">
            <Link href={routes.dropWatch(drop.id)} className={modeClass(false)}>
              watch
            </Link>
            <Link href={routes.dropListen(drop.id)} className={modeClass(false)}>
              listen
            </Link>
            <Link href={routes.dropRead(drop.id)} className={modeClass(true)}>
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

      <dl className="dropmedia-panel" aria-label="read entitlement metadata">
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
        <div>
          <dt>section</dt>
          <dd>
            {activeIndex + 1}/{sections.length}
          </dd>
        </div>
      </dl>
    </>
  );
}
