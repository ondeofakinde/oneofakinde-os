import { DropOffersScreen } from "@/features/collect/drop-offers-screen";
import { buildCollectInventorySnapshot } from "@/lib/collect/market-lanes";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropOffersPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropOffersPage({ params }: DropOffersPageProps) {
  const { id } = await params;

  const [drop, session, drops] = await Promise.all([
    gateway.getDropById(id),
    getOptionalSession(),
    gateway.listDrops()
  ]);

  if (!drop) {
    notFound();
  }

  const inventory = buildCollectInventorySnapshot(drops);
  const listing = inventory.listings.find((entry) => entry.drop.id === drop.id) ?? null;
  const offers = inventory.offersByDropId[drop.id] ?? [];

  return <DropOffersScreen drop={drop} session={session} listing={listing} offers={offers} />;
}
