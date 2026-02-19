import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type CollectMarketplaceScreenProps = {
  session: Session;
  drops: Drop[];
};

type MarketListingType = "sale" | "auction" | "resale";

type MarketplaceListing = {
  drop: Drop;
  type: MarketListingType;
  priceUsd: number;
};

const LISTING_COPY: Record<
  MarketListingType,
  {
    label: string;
    ctaLabel: string;
  }
> = {
  sale: {
    label: "for sale",
    ctaLabel: "buy now"
  },
  auction: {
    label: "auction",
    ctaLabel: "open auction"
  },
  resale: {
    label: "resale",
    ctaLabel: "open resale"
  }
};

function resolveListingType(index: number): MarketListingType {
  const cycle: MarketListingType[] = ["sale", "auction", "resale"];
  return cycle[index % cycle.length] ?? "sale";
}

function resolveMarketPrice(drop: Drop, type: MarketListingType): number {
  if (type === "auction") return Number((drop.priceUsd * 1.08).toFixed(2));
  if (type === "resale") return Number((drop.priceUsd * 1.15).toFixed(2));
  return drop.priceUsd;
}

function resolvePrimaryHref(type: MarketListingType, dropId: string): ReturnType<typeof routes.drop> {
  if (type === "auction") return routes.auctions();
  if (type === "resale") return routes.dropOffers(dropId);
  return routes.buyDrop(dropId);
}

export function CollectMarketplaceScreen({ session, drops }: CollectMarketplaceScreenProps) {
  const listings: MarketplaceListing[] = drops.slice(0, 18).map((drop, index) => {
    const type = resolveListingType(index);
    return {
      drop,
      type,
      priceUsd: resolveMarketPrice(drop, type)
    };
  });

  const sales = listings.filter((listing) => listing.type === "sale");
  const auctions = listings.filter((listing) => listing.type === "auction");
  const resales = listings.filter((listing) => listing.type === "resale");

  return (
    <AppShell
      title="collect"
      subtitle="marketplace for sale, auction, and resale drops"
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel">
        <p className="slice-label">marketplace lanes</p>
        <p className="slice-copy">collect routes only to market inventory: for sale, auction, and resale.</p>

        <div className="slice-row">
          <p className="slice-total">
            {sales.length} sale · {auctions.length} auction · {resales.length} resale
          </p>
          <Link href={routes.myCollection()} className="slice-button ghost">
            my collection
          </Link>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">for sale</p>
        <ul className="slice-grid" aria-label="sale listings">
          {sales.map((listing) => (
            <li key={`sale-${listing.drop.id}`} className="slice-drop-card">
              <p className="slice-label">{listing.drop.worldLabel}</p>
              <h2 className="slice-title">{listing.drop.title}</h2>
              <p className="slice-copy">{LISTING_COPY[listing.type].label}</p>
              <p className="slice-meta">{formatUsd(listing.priceUsd)}</p>
              <div className="slice-button-row">
                <Link href={routes.drop(listing.drop.id)} className="slice-button ghost">
                  open drop
                </Link>
                <Link href={resolvePrimaryHref(listing.type, listing.drop.id)} className="slice-button alt">
                  {LISTING_COPY[listing.type].ctaLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="slice-panel">
        <p className="slice-label">auctions</p>
        <ul className="slice-grid" aria-label="auction listings">
          {auctions.map((listing) => (
            <li key={`auction-${listing.drop.id}`} className="slice-drop-card">
              <p className="slice-label">{listing.drop.worldLabel}</p>
              <h2 className="slice-title">{listing.drop.title}</h2>
              <p className="slice-copy">{LISTING_COPY[listing.type].label}</p>
              <p className="slice-meta">current bid {formatUsd(listing.priceUsd)}</p>
              <div className="slice-button-row">
                <Link href={routes.drop(listing.drop.id)} className="slice-button ghost">
                  open drop
                </Link>
                <Link href={resolvePrimaryHref(listing.type, listing.drop.id)} className="slice-button alt">
                  {LISTING_COPY[listing.type].ctaLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="slice-panel">
        <p className="slice-label">resale</p>
        <ul className="slice-grid" aria-label="resale listings">
          {resales.map((listing) => (
            <li key={`resale-${listing.drop.id}`} className="slice-drop-card">
              <p className="slice-label">{listing.drop.worldLabel}</p>
              <h2 className="slice-title">{listing.drop.title}</h2>
              <p className="slice-copy">{LISTING_COPY[listing.type].label}</p>
              <p className="slice-meta">ask {formatUsd(listing.priceUsd)}</p>
              <div className="slice-button-row">
                <Link href={routes.drop(listing.drop.id)} className="slice-button ghost">
                  open drop
                </Link>
                <Link href={resolvePrimaryHref(listing.type, listing.drop.id)} className="slice-button alt">
                  {LISTING_COPY[listing.type].ctaLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
