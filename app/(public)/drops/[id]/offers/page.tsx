import { DropSurfaceScreen } from "@/features/drops/drop-surfaces-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropOffersPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropOffersPage({ params }: DropOffersPageProps) {
  const { id } = await params;

  const [drop, session] = await Promise.all([
    commerceGateway.getDropById(id),
    getOptionalSession()
  ]);

  if (!drop) {
    notFound();
  }

  return <DropSurfaceScreen drop={drop} session={session} surface="offers" />;
}
