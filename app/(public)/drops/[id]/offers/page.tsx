import { DropOffersScreen } from "@/features/collect/drop-offers-screen";
import { commerceBffService } from "@/lib/bff/service";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropOffersPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropOffersPage({ params }: DropOffersPageProps) {
  const { id } = await params;

  const session = await getOptionalSession();
  const [drop, collect] = await Promise.all([
    commerceBffService.getDropById(id),
    commerceBffService.getCollectDropOffers(id, session?.accountId ?? null)
  ]);

  if (!drop || !collect) {
    notFound();
  }

  return (
    <DropOffersScreen
      drop={drop}
      session={session}
      listing={collect.listing}
      offers={collect.offers}
    />
  );
}
