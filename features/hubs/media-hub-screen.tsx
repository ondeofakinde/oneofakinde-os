import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type MediaHubMode = "watch" | "listen" | "read" | "gallery";

type MediaHubScreenProps = {
  mode: MediaHubMode;
  session: Session | null;
  drops: Drop[];
};

type ModeCopy = {
  subtitle: string;
  intro: string;
  primaryActionLabel: string;
};

const MODE_COPY: Record<MediaHubMode, ModeCopy> = {
  watch: {
    subtitle: "watch hub for drop-first discovery",
    intro: "browse recent drops and jump directly into the watch surface.",
    primaryActionLabel: "watch"
  },
  listen: {
    subtitle: "listen hub for audio-first discovery",
    intro: "browse recent drops and jump directly into the listen surface.",
    primaryActionLabel: "listen"
  },
  read: {
    subtitle: "read hub for text-first discovery",
    intro: "browse recent drops and jump directly into the read surface.",
    primaryActionLabel: "read"
  },
  gallery: {
    subtitle: "gallery hub for still-image discovery",
    intro: "browse recent drops and jump directly into the gallery surface.",
    primaryActionLabel: "gallery"
  }
};

function getMediaRoute(mode: MediaHubMode, dropId: string): ReturnType<typeof routes.dropWatch> {
  if (mode === "watch") return routes.dropWatch(dropId);
  if (mode === "listen") return routes.dropListen(dropId);
  if (mode === "read") return routes.dropRead(dropId);
  return routes.dropPhotos(dropId);
}

function getPrimaryHref(mode: MediaHubMode, dropId: string, session: Session | null) {
  const target = getMediaRoute(mode, dropId);
  return session ? target : routes.signIn(target);
}

function navClass(isActive: boolean): string {
  return `slice-link ${isActive ? "active" : ""}`;
}

export function MediaHubScreen({ mode, session, drops }: MediaHubScreenProps) {
  const copy = MODE_COPY[mode];
  const featuredDrops = drops.slice(0, 12);

  return (
    <AppShell title={mode} subtitle={copy.subtitle} session={session} activeNav="townhall">
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{featuredDrops.length} featured drops</p>
          <Link href={routes.townhall()} className="slice-button ghost">
            open townhall
          </Link>
        </div>
        <p className="slice-copy">{copy.intro}</p>

        <div className="slice-nav-grid" aria-label="media hub navigation">
          <Link href={routes.watchHub()} className={navClass(mode === "watch")}>
            watch
          </Link>
          <Link href={routes.listenHub()} className={navClass(mode === "listen")}>
            listen
          </Link>
          <Link href={routes.readHub()} className={navClass(mode === "read")}>
            read
          </Link>
          <Link href={routes.galleryHub()} className={navClass(mode === "gallery")}>
            gallery
          </Link>
          <Link href={routes.liveHub()} className={navClass(false)}>
            live
          </Link>
        </div>

        {featuredDrops.length === 0 ? (
          <p className="slice-copy">no drops are available yet.</p>
        ) : (
          <ul className="slice-grid" aria-label={`${mode} drop list`}>
            {featuredDrops.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">{drop.worldLabel}</p>
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={getPrimaryHref(mode, drop.id, session)} className="slice-button alt">
                    {copy.primaryActionLabel}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
