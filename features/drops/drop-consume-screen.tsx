import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Certificate, Drop, PurchaseReceipt, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type ConsumeMode = "listen" | "read" | "photos";

type DropConsumeScreenProps = {
  mode: ConsumeMode;
  session: Session;
  drop: Drop;
  hasEntitlement: boolean;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

const MODE_COPY: Record<ConsumeMode, { title: string; intro: string; active: string }> = {
  listen: {
    title: "listen",
    intro: "this listen mode requires entitlement for full audio playback.",
    active: "now listening to"
  },
  read: {
    title: "read",
    intro: "this read mode requires entitlement for full text chapters.",
    active: "now reading"
  },
  photos: {
    title: "photos",
    intro: "this photos mode requires entitlement for the full photos set.",
    active: "now viewing photos for"
  }
};

export function DropConsumeScreen({
  mode,
  session,
  drop,
  hasEntitlement,
  receipt,
  certificate
}: DropConsumeScreenProps) {
  const copy = MODE_COPY[mode];

  return (
    <AppShell
      title={copy.title}
      subtitle={`full ${copy.title} consume surface with entitlement checks`}
      session={session}
      activeNav="explore"
    >
      {!hasEntitlement ? (
        <section className="slice-panel">
          <p className="slice-label">access required</p>
          <h2 className="slice-title">buy this drop to unlock {copy.title}</h2>
          <p className="slice-copy">{copy.intro}</p>
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
            <div className="slice-player" role="img" aria-label={`${copy.title} mode for ${drop.title}`}>
              <div className="slice-player-chrome" />
              <p className="slice-player-copy">
                {copy.active} {drop.title}
              </p>
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
