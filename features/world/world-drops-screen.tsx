import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldDropsScreenProps = {
  world: World;
  drops: Drop[];
  session: Session | null;
};

export function WorldDropsScreen({ world, drops, session }: WorldDropsScreenProps) {
  return (
    <AppShell
      title="drops in this world"
      subtitle="public drop table for this world"
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{world.title}</p>
          <Link href={routes.world(world.id)} className="slice-button ghost">
            open world
          </Link>
        </div>

        {drops.length === 0 ? (
          <p className="slice-copy">no drops available in this world yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="drops in this world list">
            {drops.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">{drop.seasonLabel}</p>
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.buyDrop(drop.id)} className="slice-button alt">
                    buy
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
