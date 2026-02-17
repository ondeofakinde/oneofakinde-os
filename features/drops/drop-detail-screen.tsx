import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type DropDetailScreenProps = {
  drop: Drop;
  session: Session | null;
};

export function DropDetailScreen({ drop, session }: DropDetailScreenProps) {
  const buyHref = session ? routes.buyDrop(drop.id) : routes.signIn(`/pay/buy/${drop.id}`);

  return (
    <AppShell
      title="drop"
      subtitle="public drop detail with world and studio context"
      session={session}
      activeNav="explore"
    >
      <article className="slice-panel">
        <p className="slice-label">{drop.seasonLabel}</p>
        <h2 className="slice-title">{drop.title}</h2>
        <p className="slice-copy">{drop.synopsis}</p>

        <dl className="slice-meta-grid">
          <div className="slice-meta-item">
            <dt>world</dt>
            <dd>
              <Link href={routes.world(drop.worldId)}>{drop.worldLabel}</Link>
            </dd>
          </div>
          <div className="slice-meta-item">
            <dt>studio</dt>
            <dd>
              <Link href={routes.studio(drop.studioHandle)}>@{drop.studioHandle}</Link>
            </dd>
          </div>
          <div className="slice-meta-item">
            <dt>episode</dt>
            <dd>{drop.episodeLabel}</dd>
          </div>
          <div className="slice-meta-item">
            <dt>release</dt>
            <dd>{drop.releaseDate}</dd>
          </div>
        </dl>

        <div className="slice-row">
          <span className="slice-price">{formatUsd(drop.priceUsd)}</span>
          <div className="slice-button-row">
            <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
              watch preview
            </Link>
            <Link href={buyHref} className="slice-button">
              buy
            </Link>
          </div>
        </div>
      </article>
    </AppShell>
  );
}
