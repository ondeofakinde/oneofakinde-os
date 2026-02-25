import type {
  CollectInventoryListing,
  CollectListingType,
  CollectMarketLane,
  CollectOffer,
  Drop
} from "@/lib/domain/contracts";
import { applyCollectOfferAction } from "@/lib/collect/offer-state-machine";

type CollectInventorySnapshot = {
  listings: CollectInventoryListing[];
  offersByDropId: Record<string, CollectOffer[]>;
};

const LISTING_CYCLE: CollectListingType[] = ["sale", "auction", "resale"];

const PRICE_MULTIPLIER: Record<CollectListingType, number> = {
  sale: 1,
  auction: 1.08,
  resale: 1.15
};

const OFFER_ACTOR_BY_INDEX = ["collector_demo", "pilot_rosa", "market_lee", "story_ana"];

function isCollectLane(value: string): value is CollectMarketLane {
  return value === "all" || value === "sale" || value === "auction" || value === "resale";
}

function toUsd(value: number): number {
  return Number(value.toFixed(2));
}

function laneForDropIndex(index: number): CollectListingType {
  return LISTING_CYCLE[index % LISTING_CYCLE.length] ?? "sale";
}

function derivePrice(drop: Drop, listingType: CollectListingType): number {
  return toUsd(drop.priceUsd * PRICE_MULTIPLIER[listingType]);
}

function formatOfferId(dropId: string, index: number): string {
  return `offer_${dropId.replace(/[^a-z0-9_-]/gi, "")}_${index + 1}`;
}

function buildOfferTimeline(
  drop: Drop,
  listingType: CollectListingType,
  listingIndex: number
): CollectOffer[] {
  const releaseTimestamp = Date.parse(`${drop.releaseDate}T12:00:00.000Z`) || Date.now();
  const createdAt = new Date(releaseTimestamp + listingIndex * 60_000).toISOString();
  const baseOffer: CollectOffer = {
    id: formatOfferId(drop.id, listingIndex),
    dropId: drop.id,
    listingType,
    amountUsd: derivePrice(drop, listingType),
    state: "listed",
    actorHandle: OFFER_ACTOR_BY_INDEX[listingIndex % OFFER_ACTOR_BY_INDEX.length] ?? "collector_demo",
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(releaseTimestamp + 1000 * 60 * 60 * 24 * 14).toISOString()
  };

  if (listingType === "sale") {
    return [baseOffer];
  }

  if (listingType === "auction") {
    const submitted = applyCollectOfferAction(baseOffer, "submit_offer", {
      amountUsd: toUsd(baseOffer.amountUsd * 1.06),
      updatedAt: new Date(releaseTimestamp + 1000 * 60 * 20).toISOString()
    });
    return [submitted];
  }

  const submitted = applyCollectOfferAction(baseOffer, "submit_offer", {
    amountUsd: toUsd(baseOffer.amountUsd * 0.94),
    updatedAt: new Date(releaseTimestamp + 1000 * 60 * 15).toISOString()
  });
  const countered = applyCollectOfferAction(submitted, "counter_offer", {
    amountUsd: toUsd(baseOffer.amountUsd * 1.01),
    updatedAt: new Date(releaseTimestamp + 1000 * 60 * 28).toISOString()
  });
  return [countered];
}

function toListing(
  drop: Drop,
  listingType: CollectListingType,
  offers: CollectOffer[]
): CollectInventoryListing {
  const highestOfferUsd =
    offers.length > 0 ? Math.max(...offers.map((offer) => offer.amountUsd)) : null;
  const latestOffer = offers[0];

  return {
    drop,
    listingType,
    lane: listingType,
    priceUsd: derivePrice(drop, listingType),
    offerCount: offers.length,
    highestOfferUsd,
    latestOfferState: latestOffer?.state ?? "listed"
  };
}

export function parseCollectMarketLane(input: string | null | undefined): CollectMarketLane {
  const normalized = input?.trim().toLowerCase() ?? "";
  if (isCollectLane(normalized)) {
    return normalized;
  }
  return "all";
}

export function listCollectInventoryByLane(
  listings: CollectInventoryListing[],
  lane: CollectMarketLane
): CollectInventoryListing[] {
  if (lane === "all") {
    return listings;
  }
  return listings.filter((entry) => entry.lane === lane);
}

export function buildCollectInventorySnapshot(drops: Drop[]): CollectInventorySnapshot {
  const sortedDrops = [...drops].sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate));
  const offersByDropId: Record<string, CollectOffer[]> = {};
  const listings = sortedDrops.map((drop, index) => {
    const listingType = laneForDropIndex(index);
    const offers = buildOfferTimeline(drop, listingType, index);
    offersByDropId[drop.id] = offers;
    return toListing(drop, listingType, offers);
  });

  return {
    listings,
    offersByDropId
  };
}
