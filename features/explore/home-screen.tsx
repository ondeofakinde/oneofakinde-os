import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type HomeScreenProps = {
  session: Session | null;
  drops: Drop[];
  worlds: World[];
};

export function HomeScreen({ session, drops, worlds }: HomeScreenProps) {
  const featured = drops.slice(0, 3);

  return (
    <AppShell
      title="oneofakinde"
      subtitle="home surface for drops, worlds, and studio pathways"
      session={session}
      activeNav="explore"
    >
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">featured drops</p>
          <Link href={routes.townhall()} className="slice-button">
            open townhall
          </Link>
        </div>

        <ul className="slice-grid" aria-label="featured drops">
          {featured.map((drop) => (
            <li key={drop.id} className="slice-drop-card">
              <p className="slice-label">{drop.worldLabel}</p>
              <h2 className="slice-title">{drop.title}</h2>
              <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
              <Link href={routes.drop(drop.id)} className="slice-button ghost">
                open drop
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="slice-panel">
        <p className="slice-label">worlds</p>
        <ul className="slice-world-grid" aria-label="world highlights">
          {worlds.map((world) => (
            <li key={world.id} className="slice-world-card">
              <h2 className="slice-title">{world.title}</h2>
              <p className="slice-copy">{world.synopsis}</p>
              <Link href={routes.world(world.id)} className="slice-button alt">
                open world
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
