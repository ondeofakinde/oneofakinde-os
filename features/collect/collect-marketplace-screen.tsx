import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { listCollectInventoryByLane } from "@/lib/collect/market-lanes";
import type {
  CollectLiveSessionSnapshot,
  CollectInventoryListing,
  CollectListingType,
  CollectMarketLane,
  MembershipEntitlement,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import type { Route } from "next";
import Link from "next/link";

type CollectMarketplaceScreenProps = {
  session: Session;
  listings: CollectInventoryListing[];
  initialLane?: CollectMarketLane;
  memberships: MembershipEntitlement[];
  liveSessions: CollectLiveSessionSnapshot[];
};

const LISTING_COPY: Record<
  CollectListingType,
  {
    label: string;
    ctaLabel: string;
  }
> = {
  sale: {
    label: "for sale",
    ctaLabel: "collect"
  },
  auction: {
    label: "auction",
    ctaLabel: "collect"
  },
  resale: {
    label: "resale",
    ctaLabel: "collect"
  }
};

const LANE_LABELS: Record<CollectMarketLane, string> = {
  all: "all",
  sale: "sale",
  auction: "auction",
  resale: "resale"
};

function resolvePrimaryHref(type: CollectListingType, dropId: string): Route {
  if (type === "sale") return routes.collectDrop(dropId);
  return routes.dropOffers(dropId);
}

function laneHref(lane: CollectMarketLane): Route {
  if (lane === "all") {
    return routes.collect();
  }

  return `${routes.collect()}?lane=${encodeURIComponent(lane)}` as Route;
}

function sectionTitle(type: CollectListingType): string {
  if (type === "sale") return "for sale";
  if (type === "auction") return "auctions";
  return "resale";
}

function sectionPriceLabel(type: CollectListingType, priceUsd: number): string {
  if (type === "auction") return `current bid ${formatUsd(priceUsd)}`;
  if (type === "resale") return `ask ${formatUsd(priceUsd)}`;
  return formatUsd(priceUsd);
}

export function CollectMarketplaceScreen({
  session,
  listings,
  initialLane = "all",
  memberships,
  liveSessions
}: CollectMarketplaceScreenProps) {
  const sales = listings.filter((listing) => listing.listingType === "sale");
  const auctions = listings.filter((listing) => listing.listingType === "auction");
  const resales = listings.filter((listing) => listing.listingType === "resale");

  const sections: Array<{ key: CollectListingType; items: CollectInventoryListing[] }> = [
    { key: "sale", items: sales },
    { key: "auction", items: auctions },
    { key: "resale", items: resales }
  ];

  const visibleSections =
    initialLane === "all"
      ? sections
      : sections.filter((section) => section.key === initialLane);

  const visibleListings = listCollectInventoryByLane(listings, initialLane);
  const activeMembershipCount = memberships.filter((membership) => membership.isActive).length;
  const eligibleLiveSessionCount = liveSessions.filter((entry) => entry.eligibility.eligible).length;

  return (
    <AppShell
      title="collect"
      subtitle="marketplace for sale, auction, and resale drops"
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel">
        <p className="slice-label">marketplace lanes</p>
        <p className="slice-copy">
          collect routes only to market inventory: for sale, auction, and resale.
        </p>

        <div className="slice-row">
          <p className="slice-total">
            {visibleListings.length} visible · {sales.length} sale · {auctions.length} auction ·{" "}
            {resales.length} resale
          </p>
          <Link href={routes.myCollection()} className="slice-button ghost">
            my collection
          </Link>
        </div>

        <div className="slice-nav-grid" aria-label="collect lane filters">
          {(Object.keys(LANE_LABELS) as CollectMarketLane[]).map((lane) => (
            <Link
              key={lane}
              href={laneHref(lane)}
              className={`slice-link ${initialLane === lane ? "active" : ""}`}
              aria-label={`${LANE_LABELS[lane]} lane`}
            >
              {LANE_LABELS[lane]}
            </Link>
          ))}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">memberships + eligibility</p>
        <p className="slice-copy">
          active memberships unlock eligible live sessions across studio and world rails.
        </p>
        <p className="slice-total">
          {activeMembershipCount} active memberships · {eligibleLiveSessionCount} eligible live sessions
        </p>

        {memberships.length === 0 ? (
          <p className="slice-meta">no memberships yet. collect and membership drops will unlock this lane.</p>
        ) : (
          <ul className="slice-grid" aria-label="membership entitlements">
            {memberships.map((membership) => (
              <li key={membership.id} className="slice-drop-card">
                <p className="slice-label">{membership.studioHandle}</p>
                <h2 className="slice-title">{membership.worldId ?? "studio-wide membership"}</h2>
                <p className="slice-copy">{membership.whatYouGet}</p>
                <p className="slice-meta">
                  status: {membership.status} · {membership.isActive ? "active now" : "inactive"}
                </p>
                <p className="slice-meta">
                  starts {new Date(membership.startedAt).toLocaleString()}
                  {membership.endsAt
                    ? ` · ends ${new Date(membership.endsAt).toLocaleString()}`
                    : " · no end date"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel" id="collect-gated-events">
        <p className="slice-label">gated events in collect</p>
        <p className="slice-copy">
          workshop-created live sessions are discovered here and enforce eligibility by rule:
          public, membership active, or drop ownership.
        </p>
        {liveSessions.length === 0 ? (
          <p className="slice-meta">no live sessions available.</p>
        ) : (
          <ul className="slice-grid" aria-label="collect live sessions">
            {liveSessions.map((entry) => {
              const fallbackHref: Route =
                entry.liveSession.dropId !== null
                  ? routes.collectDrop(entry.liveSession.dropId)
                  : routes.collect();

              return (
                <li key={entry.liveSession.id} className="slice-drop-card">
                  <p className="slice-label">{entry.liveSession.studioHandle}</p>
                  <h2 className="slice-title">{entry.liveSession.title}</h2>
                  <p className="slice-copy">{entry.liveSession.synopsis}</p>
                  <p className="slice-meta">
                    starts {new Date(entry.liveSession.startsAt).toLocaleString()}
                  </p>
                  <p className="slice-meta">
                    rule: {entry.liveSession.eligibilityRule.replaceAll("_", " ")} ·{" "}
                    {entry.eligibility.eligible
                      ? "eligible"
                      : entry.eligibility.reason.replaceAll("_", " ")}
                  </p>
                  <p className="slice-meta">
                    source:{" "}
                    {entry.liveSession.id.startsWith("live_workshop_")
                      ? "workshop-created"
                      : "catalog-seeded"}
                  </p>
                  <p className="slice-meta">{entry.liveSession.whatYouGet}</p>
                  <div className="slice-button-row">
                    <Link
                      href={entry.eligibility.eligible ? routes.liveHub() : fallbackHref}
                      className="slice-button alt"
                    >
                      {entry.eligibility.eligible ? "open live" : "collect to unlock"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {visibleSections.map((section) => (
        <section key={section.key} className="slice-panel">
          <p className="slice-label">{sectionTitle(section.key)}</p>
          <ul className="slice-grid" aria-label={`${section.key} listings`}>
            {section.items.map((listing) => (
              <li key={`${section.key}-${listing.drop.id}`} className="slice-drop-card">
                <p className="slice-label">{listing.drop.worldLabel}</p>
                <h2 className="slice-title">{listing.drop.title}</h2>
                <p className="slice-copy">{LISTING_COPY[listing.listingType].label}</p>
                <p className="slice-meta">{sectionPriceLabel(listing.listingType, listing.priceUsd)}</p>
                <p className="slice-label">
                  state: {listing.latestOfferState.replaceAll("_", " ")} · offers: {listing.offerCount}
                </p>
                <div className="slice-button-row">
                  <Link href={routes.drop(listing.drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link
                    href={resolvePrimaryHref(listing.listingType, listing.drop.id)}
                    className="slice-button alt"
                  >
                    {LISTING_COPY[listing.listingType].ctaLabel}
                  </Link>
                  <Link href={routes.dropOffers(listing.drop.id)} className="slice-button ghost">
                    offers
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </AppShell>
  );
}
