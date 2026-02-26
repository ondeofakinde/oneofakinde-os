import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { isStudioPinned, sortDropsForStudioSurface } from "@/lib/catalog/drop-curation";
import type { Drop, Session, Studio, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type StudioScreenProps = {
  session: Session | null;
  studio: Studio;
  worlds: World[];
  drops: Drop[];
};

export function StudioScreen({ session, studio, worlds, drops }: StudioScreenProps) {
  const orderedDrops = sortDropsForStudioSurface(drops);
  const pinnedDrops = orderedDrops.filter((drop) => isStudioPinned(drop));

  return (
    <AppShell
      title="studio"
      subtitle="public studio surface with drops and world context"
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <p className="slice-label">@{studio.handle}</p>
        <h2 className="slice-title">{studio.title}</h2>
        <p className="slice-copy">{studio.synopsis}</p>
      </section>

      <section className="slice-panel">
        <p className="slice-label">worlds</p>
        <ul className="slice-world-grid" aria-label="studio worlds">
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
      </section>

      {pinnedDrops.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">studio pinned</p>
          <ul className="slice-grid" aria-label="studio pinned drops">
            {pinnedDrops.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">pin #{drop.studioPinRank ?? 0}</p>
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
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">drops</p>
        <ul className="slice-grid" aria-label="studio drops">
          {orderedDrops.map((drop) => (
            <li key={drop.id} className="slice-drop-card">
              {drop.worldOrderIndex ? <p className="slice-label">world order #{drop.worldOrderIndex}</p> : null}
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
    </AppShell>
  );
}
