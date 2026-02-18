import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { LibrarySnapshot, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type FavoritesScreenProps = {
  session: Session;
  favorites: LibrarySnapshot;
};

export function FavoritesScreen({ session, favorites }: FavoritesScreenProps) {
  return (
    <AppShell
      title="favorites"
      subtitle="saved drop curation and quick access"
      session={session}
      activeNav="favorites"
    >
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{favorites.savedDrops.length} saved drops</p>
          <Link href={routes.explore()} className="slice-button ghost">
            open explore
          </Link>
        </div>

        {favorites.savedDrops.length === 0 ? (
          <p className="slice-copy">your favorites list is empty. save drops from explore to populate it.</p>
        ) : (
          <ul className="slice-grid" aria-label="favorites drop list">
            {favorites.savedDrops.map((item) => (
              <li key={`${item.drop.id}:${item.savedAt}`} className="slice-drop-card">
                <p className="slice-label">saved {item.savedAt.slice(0, 10)}</p>
                <h2 className="slice-title">{item.drop.title}</h2>
                <p className="slice-copy">{item.drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(item.drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(item.drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.world(item.drop.worldId)} className="slice-button alt">
                    open world
                  </Link>
                  <Link href={routes.studio(item.drop.studioHandle)} className="slice-button alt">
                    open studio
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
