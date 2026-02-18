import { FavoritesScreen } from "@/features/favorites/favorites-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

export default async function FavoritesPage() {
  const session = await requireSession("/favorites");
  const favorites = await gateway.getLibrary(session.accountId);

  if (!favorites) {
    notFound();
  }

  return <FavoritesScreen session={session} favorites={favorites} />;
}
