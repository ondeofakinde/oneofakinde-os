import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldDetailScreenProps = {
  world: World;
  drops: Drop[];
  session: Session | null;
};

export function WorldDetailScreen({ world, drops, session }: WorldDetailScreenProps) {
  return (
    <AppShell
      title="world"
      subtitle="world detail with related drops and studio linkage"
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <p className="slice-label">studio @{world.studioHandle}</p>
        <h2 className="slice-title">{world.title}</h2>
        <p className="slice-copy">{world.synopsis}</p>
        <div className="slice-button-row">
          <Link href={routes.worldDrops(world.id)} className="slice-button">
            open drops
          </Link>
          <Link href={routes.studio(world.studioHandle)} className="slice-button alt">
            open studio
          </Link>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">recent drops</p>
        {drops.length === 0 ? (
          <p className="slice-copy">no drops published in this world yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="world drop highlights">
            {drops.slice(0, 6).map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.dropPreview(drop.id)} className="slice-button alt">
                    preview
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
