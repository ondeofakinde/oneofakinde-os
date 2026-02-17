import { AppShell } from "@/features/shell/app-shell";
import type { Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldsScreenProps = {
  session: Session | null;
  worlds: World[];
};

export function WorldsScreen({ session, worlds }: WorldsScreenProps) {
  return (
    <AppShell
      title="worlds"
      subtitle="public worlds index for browse and discovery"
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <ul className="slice-world-grid" aria-label="worlds index list">
          {worlds.map((world) => (
            <li key={world.id} className="slice-world-card">
              <p className="slice-label">studio @{world.studioHandle}</p>
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
    </AppShell>
  );
}
