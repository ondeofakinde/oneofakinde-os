import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorkshopRootScreenProps = {
  session: Session;
  channelTitle: string;
  channelSynopsis: string;
  worlds: World[];
  drops: Drop[];
};

export function WorkshopRootScreen({
  session,
  channelTitle,
  channelSynopsis,
  worlds,
  drops
}: WorkshopRootScreenProps) {
  return (
    <AppShell
      title="workshop"
      subtitle="creator workspace for drop lifecycle and publishing"
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <p className="slice-label">creator @{session.handle}</p>
        <h2 className="slice-title">{channelTitle}</h2>
        <p className="slice-copy">{channelSynopsis}</p>

        <dl className="slice-list">
          <div>
            <dt>linked worlds</dt>
            <dd>{worlds.length}</dd>
          </div>
          <div>
            <dt>published drops</dt>
            <dd>{drops.length}</dd>
          </div>
        </dl>

        <div className="slice-button-row">
          <Link href={routes.spaceSetup()} className="slice-button ghost">
            open space setup
          </Link>
          <Link href={routes.townhall()} className="slice-button alt">
            open townhall
          </Link>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">worlds</p>
        {worlds.length === 0 ? (
          <p className="slice-copy">
            no linked worlds were found for this creator account yet.
          </p>
        ) : (
          <ul className="slice-world-grid" aria-label="workshop world list">
            {worlds.map((world) => (
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

      <section className="slice-panel">
        <p className="slice-label">drops</p>
        {drops.length === 0 ? (
          <p className="slice-copy">
            no drops have been published yet for this creator account.
          </p>
        ) : (
          <ul className="slice-grid" aria-label="workshop drop list">
            {drops.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">{drop.worldLabel}</p>
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.dropDetails(drop.id)} className="slice-button alt">
                    details
                  </Link>
                  <Link href={routes.dropActivity(drop.id)} className="slice-button alt">
                    activity
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
