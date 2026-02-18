import { SpaceSetupScreen } from "@/features/setup/space-setup-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

export default async function SpaceSetupPage() {
  const session = await requireSession("/space-setup");

  const [collection, library, worlds] = await Promise.all([
    gateway.getMyCollection(session.accountId),
    gateway.getLibrary(session.accountId),
    gateway.listWorlds()
  ]);

  if (!collection || !library) {
    notFound();
  }

  return (
    <SpaceSetupScreen
      session={session}
      collection={collection}
      library={library}
      worlds={worlds}
    />
  );
}
