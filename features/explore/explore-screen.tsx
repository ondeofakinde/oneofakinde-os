import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type ExploreScreenProps = {
  session: Session | null;
  drops: Drop[];
  worlds: World[];
};

export function ExploreScreen({ session, drops, worlds }: ExploreScreenProps) {
  return (
    <AppShell
      title="explore"
      subtitle="explore drops across worlds and studios"
      session={session}
      activeNav="explore"
    >
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">featured drops</p>
          <Link href={routes.worlds()} className="slice-button ghost">
            browse worlds
          </Link>
        </div>

        <ul className="slice-grid" aria-label="explore drop list">
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
                <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
                  watch
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="slice-panel">
        <p className="slice-label">worlds</p>
        <ul className="slice-world-grid" aria-label="world list">
          {worlds.map((world) => (
            <li key={world.id} className="slice-world-card">
              <h2 className="slice-title">{world.title}</h2>
              <p className="slice-copy">{world.synopsis}</p>
              <div className="slice-button-row">
                <Link href={routes.world(world.id)} className="slice-button ghost">
                  open world
                </Link>
                <Link href={routes.studio(world.studioHandle)} className="slice-button alt">
                  open studio
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
