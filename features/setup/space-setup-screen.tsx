import { AppShell } from "@/features/shell/app-shell";
import type { LibrarySnapshot, MyCollectionSnapshot, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type SpaceSetupScreenProps = {
  session: Session;
  collection: MyCollectionSnapshot;
  library: LibrarySnapshot;
  worlds: World[];
};

export function SpaceSetupScreen({ session, collection, library, worlds }: SpaceSetupScreenProps) {
  const hasCreatorRole = session.roles.includes("creator");

  return (
    <AppShell
      title="space setup"
      subtitle="first run destination setup and account routing"
      session={session}
      activeNav="explore"
    >
      <section className="slice-panel">
        <p className="slice-label">welcome @{session.handle}</p>
        <h2 className="slice-title">set your home destinations</h2>
        <p className="slice-copy">
          pick where this account should land first and confirm your core routes for collection, library, and worlds.
        </p>

        <dl className="slice-list">
          <div>
            <dt>roles</dt>
            <dd>{session.roles.join(", ")}</dd>
          </div>
          <div>
            <dt>owned drops</dt>
            <dd>{collection.ownedDrops.length}</dd>
          </div>
          <div>
            <dt>saved drops</dt>
            <dd>{library.savedDrops.length}</dd>
          </div>
        </dl>

        <div className="slice-button-row">
          <Link href={routes.explore()} className="slice-button">
            open explore
          </Link>
          <Link href={routes.myCollection()} className="slice-button alt">
            open my collection
          </Link>
          <Link href={routes.library()} className="slice-button alt">
            open library
          </Link>
          {hasCreatorRole ? (
            <Link href={routes.workshop()} className="slice-button alt">
              open workshop
            </Link>
          ) : null}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">available worlds</p>
        {worlds.length === 0 ? (
          <p className="slice-copy">no worlds available yet.</p>
        ) : (
          <ul className="slice-world-grid" aria-label="space setup world list">
            {worlds.slice(0, 6).map((world) => (
              <li key={world.id} className="slice-world-card">
                <h2 className="slice-title">{world.title}</h2>
                <p className="slice-copy">{world.synopsis}</p>
                <div className="slice-button-row">
                  <Link href={routes.world(world.id)} className="slice-button ghost">
                    open world
                  </Link>
                  <Link href={routes.worldDrops(world.id)} className="slice-button alt">
                    open drops
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
