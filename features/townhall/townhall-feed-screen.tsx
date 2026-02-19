import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type TownhallMode = "watch" | "listen" | "read" | "gallery" | "live";

type TownhallFeedScreenProps = {
  mode: TownhallMode;
  session: Session | null;
  drops: Drop[];
};

type ModeCopy = {
  kicker: string;
  cta: string;
};

const MODE_COPY: Record<TownhallMode, ModeCopy> = {
  watch: {
    kicker: "video community hub",
    cta: "watch"
  },
  listen: {
    kicker: "audio community hub",
    cta: "listen"
  },
  read: {
    kicker: "text community hub",
    cta: "read"
  },
  gallery: {
    kicker: "still-image community hub",
    cta: "open gallery"
  },
  live: {
    kicker: "live community hub",
    cta: "join live"
  }
};

function modeHref(mode: TownhallMode, dropId: string): ReturnType<typeof routes.dropWatch> {
  if (mode === "watch") return routes.dropWatch(dropId);
  if (mode === "listen") return routes.dropListen(dropId);
  if (mode === "read") return routes.dropRead(dropId);
  if (mode === "gallery") return routes.dropPhotos(dropId);
  return routes.dropWatch(dropId);
}

function modeRoute(mode: TownhallMode): ReturnType<typeof routes.townhall> {
  if (mode === "watch") return routes.townhallWatch();
  if (mode === "listen") return routes.townhallListen();
  if (mode === "read") return routes.townhallRead();
  if (mode === "gallery") return routes.townhallGallery();
  return routes.townhallLive();
}

function modeLinkClass(active: boolean): string {
  return `townhall-mode-link ${active ? "active" : ""}`;
}

function navLinkClass(active: boolean): string {
  return `townhall-bottom-link ${active ? "active" : ""}`;
}

function socialCount(index: number): string {
  const values = ["2.4k", "416", "1.1k", "92", "+"];
  return values[index] ?? "0";
}

const SOCIAL_ICONS = ["♡", "◍", "◈", "➤", "+"] as const;

export function TownhallFeedScreen({ mode, session, drops }: TownhallFeedScreenProps) {
  const featuredDrop = drops[0];
  const queue = drops.slice(1, 5);
  const copy = MODE_COPY[mode];

  if (!featuredDrop) {
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

  const primaryTarget = modeHref(mode, featuredDrop.id);
  const primaryHref = session ? primaryTarget : routes.signIn(primaryTarget);

  return (
    <main className="townhall-page">
      <section className="townhall-phone-shell" aria-label="townhall feed shell">
        <header className="townhall-header">
          <Link href={session ? routes.create() : routes.signIn(routes.create())} className="townhall-icon-link" aria-label="create drop">
            +
          </Link>
          <p className="townhall-brand">oneofakinde</p>
          <form action={routes.townhall()} method="get" className="townhall-search-form" role="search" aria-label="search oneofakinde">
            <input
              type="search"
              name="q"
              className="townhall-search-input"
              placeholder="search users, worlds, collections, drops"
              aria-label="search users, worlds, collections, and drops"
            />
          </form>
        </header>

        <section className="townhall-stage" aria-label="featured townhall drop">
          <div className="townhall-backdrop" />
          <div className="townhall-overlay" />

          <div className="townhall-content">
            <p className="townhall-kicker">{copy.kicker}</p>
            <p className="townhall-meta">
              @{featuredDrop.studioHandle} · {formatUsd(featuredDrop.priceUsd)} · {featuredDrop.releaseDate}
            </p>
            <h1 className="townhall-title">{featuredDrop.title}</h1>
            <p className="townhall-subtitle">
              {featuredDrop.seasonLabel} · {featuredDrop.episodeLabel}
            </p>
            <p className="townhall-synopsis">{featuredDrop.synopsis}</p>

            <div className="townhall-mode-row" aria-label="townhall mode links">
              <Link href={routes.townhallWatch()} className={modeLinkClass(mode === "watch")}>watch</Link>
              <Link href={routes.townhallListen()} className={modeLinkClass(mode === "listen")}>listen</Link>
              <Link href={routes.townhallRead()} className={modeLinkClass(mode === "read")}>read</Link>
              <Link href={routes.townhallGallery()} className={modeLinkClass(mode === "gallery")}>gallery</Link>
              <Link href={routes.townhallLive()} className={modeLinkClass(mode === "live")}>live</Link>
            </div>

            <div className="townhall-cta-row">
              <Link href={primaryHref} className="townhall-primary-cta">
                {copy.cta}
              </Link>
              <Link href={routes.drop(featuredDrop.id)} className="townhall-secondary-cta">
                open drop
              </Link>
            </div>
          </div>

          <aside className="townhall-social-rail" aria-label="social interactions">
            {SOCIAL_ICONS.map((icon, index) => (
              <button key={icon + index} type="button" className="townhall-social-action" disabled>
                <span>{icon}</span>
                <small>{socialCount(index)}</small>
              </button>
            ))}
          </aside>
        </section>

        <section className="townhall-queue" aria-label="up next drops">
          <p className="townhall-queue-label">up next</p>
          <div className="townhall-queue-grid">
            {queue.map((dropItem) => (
              <Link key={dropItem.id} href={modeHref(mode, dropItem.id)} className="townhall-queue-card">
                <p>{dropItem.title}</p>
                <span>{dropItem.worldLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <nav className="townhall-bottom-nav" aria-label="townhall bottom nav">
          <Link href={routes.townhallListen()} className={navLinkClass(mode === "listen")}>listen</Link>
          <Link href={routes.townhallRead()} className={navLinkClass(mode === "read")}>read</Link>
          <Link href={routes.townhallWatch()} className={navLinkClass(mode === "watch")}>watch</Link>
          <Link href={routes.townhallGallery()} className={navLinkClass(mode === "gallery")}>gallery</Link>
          <Link href={routes.collect()} className={navLinkClass(false)}>collect</Link>
          <Link href={routes.townhallLive()} className={navLinkClass(mode === "live")}>live</Link>
        </nav>
      </section>

      <aside className="townhall-side-notes" aria-label="townhall concept notes">
        <h2>townhall shell</h2>
        <p>primary os viewing feed with persistent media nav and social interactions.</p>
        <p>default mode: watch. one tap switches to listen, read, gallery, or live.</p>
      </aside>
    </main>
  );
}
