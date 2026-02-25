import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { getAllowedCollectOfferActions } from "@/lib/collect/offer-state-machine";
import type { CollectInventoryListing, CollectOffer, Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type DropOffersScreenProps = {
  drop: Drop;
  session: Session | null;
  listing: CollectInventoryListing | null;
  offers: CollectOffer[];
};

function formatState(value: string): string {
  return value.replaceAll("_", " ");
}

export function DropOffersScreen({
  drop,
  session,
  listing,
  offers
}: DropOffersScreenProps) {
  const collectHref = session
    ? routes.collectDrop(drop.id)
    : routes.signIn(routes.collectDrop(drop.id));

  const laneTitle = listing?.listingType ?? "sale";
  const nextActions = listing
    ? getAllowedCollectOfferActions(listing.latestOfferState)
    : getAllowedCollectOfferActions("listed");

  return (
    <AppShell
      title="offers"
      subtitle={`state machine for ${drop.title}`}
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel">
        <p className="slice-label">{drop.worldLabel}</p>
        <h2 className="slice-title">{drop.title}</h2>
        <p className="slice-copy">
          lane: {laneTitle} · list price {formatUsd(listing?.priceUsd ?? drop.priceUsd)}
        </p>
        <p className="slice-label">
          latest state: {formatState(listing?.latestOfferState ?? "listed")}
        </p>
        <div className="slice-button-row">
          <Link href={routes.collect()} className="slice-button ghost">
            back to collect
          </Link>
          <Link href={collectHref} className="slice-button alt">
            collect
          </Link>
          <Link href={routes.drop(drop.id)} className="slice-button ghost">
            open drop
          </Link>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">allowed next actions</p>
        <dl className="slice-list">
          {nextActions.map((action) => (
            <div key={action}>
              <dt>{formatState(action)}</dt>
              <dd>allowed</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="slice-panel">
        <p className="slice-label">offer timeline</p>
        {offers.length === 0 ? (
          <p className="slice-copy">no offers yet for this drop.</p>
        ) : (
          <ul className="slice-grid" aria-label="drop offers">
            {offers.map((offer) => (
              <li key={offer.id} className="slice-drop-card">
                <p className="slice-label">{offer.actorHandle}</p>
                <h3 className="slice-title">{formatUsd(offer.amountUsd)}</h3>
                <p className="slice-copy">state: {formatState(offer.state)}</p>
                <p className="slice-label">updated {new Date(offer.updatedAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
