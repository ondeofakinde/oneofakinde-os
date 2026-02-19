import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type LiveNowScreenProps = {
  session: Session | null;
  drops: Drop[];
};

function formatDateLabel(input: string): string {
  const value = Date.parse(input);
  if (Number.isNaN(value)) {
    return input;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function LiveNowScreen({ session, drops }: LiveNowScreenProps) {
  const feed = drops.slice(0, 8);

  return (
    <AppShell title="live" subtitle="live hub for current drop programming" session={session} activeNav="explore">
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{feed.length} live entries</p>
          <Link href={routes.townhall()} className="slice-button ghost">
            open townhall
          </Link>
        </div>

        <p className="slice-copy">
          track what is airing across worlds now, then continue into watch, listen, read, or gallery.
        </p>

        <div className="slice-nav-grid" aria-label="live navigation">
          <Link href={routes.watchHub()} className="slice-link">
            watch
          </Link>
          <Link href={routes.listenHub()} className="slice-link">
            listen
          </Link>
          <Link href={routes.readHub()} className="slice-link">
            read
          </Link>
          <Link href={routes.galleryHub()} className="slice-link">
            gallery
          </Link>
          <Link href={routes.liveHub()} className="slice-link active">
            live
          </Link>
        </div>

        {feed.length === 0 ? (
          <p className="slice-copy">no live entries are currently available.</p>
        ) : (
          <ul className="slice-grid" aria-label="live feed">
            {feed.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">
                  {drop.worldLabel} · {formatDateLabel(drop.releaseDate)}
                </p>
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link
                    href={session ? routes.dropWatch(drop.id) : routes.signIn(routes.dropWatch(drop.id))}
                    className="slice-button alt"
                  >
                    watch
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
