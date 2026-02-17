import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Certificate, Drop, PurchaseReceipt, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WatchScreenProps = {
  session: Session;
  drop: Drop;
  hasEntitlement: boolean;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

export function WatchScreen({
  session,
  drop,
  hasEntitlement,
  receipt,
  certificate
}: WatchScreenProps) {
  return (
    <AppShell
      title="watch"
      subtitle="full watch consume surface with entitlement checks"
      session={session}
      activeNav="explore"
    >
      {!hasEntitlement ? (
        <section className="slice-panel">
          <p className="slice-label">access required</p>
          <h2 className="slice-title">buy this drop to unlock watch</h2>
          <p className="slice-copy">
            this watch mode requires entitlement. complete purchase to unlock the full stream.
          </p>
          <div className="slice-button-row">
            <Link href={routes.buyDrop(drop.id)} className="slice-button">
              buy {formatUsd(drop.priceUsd)}
            </Link>
            <Link href={routes.drop(drop.id)} className="slice-button ghost">
              open drop
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="slice-panel">
            <div className="slice-player" role="img" aria-label={`watch stream for ${drop.title}`}>
              <div className="slice-player-chrome" />
              <p className="slice-player-copy">now watching {drop.title}</p>
            </div>

            <div className="slice-row">
              <p className="slice-label">{drop.seasonLabel}</p>
              <p className="slice-total">{drop.episodeLabel}</p>
            </div>

            <div className="slice-button-row">
              <Link href={routes.drop(drop.id)} className="slice-button ghost">
                open drop
              </Link>
              <Link href={routes.myCollection()} className="slice-button alt">
                my collection
              </Link>
              {certificate ? (
                <Link href={routes.certificate(certificate.id)} className="slice-button alt">
                  certificate
                </Link>
              ) : null}
            </div>
          </section>

          <section className="slice-panel">
            <p className="slice-label">entitlement details</p>
            <dl className="slice-list">
              <div>
                <dt>world</dt>
                <dd>{drop.worldLabel}</dd>
              </div>
              <div>
                <dt>studio</dt>
                <dd>@{drop.studioHandle}</dd>
              </div>
              <div>
                <dt>receipt</dt>
                <dd>{receipt?.id ?? "n/a"}</dd>
              </div>
              <div>
                <dt>certificate</dt>
                <dd>{certificate?.id ?? "n/a"}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </AppShell>
  );
}
