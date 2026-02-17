import { WorldsScreen } from "@/features/explore/worlds-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { getOptionalSession } from "@/lib/server/session";

export default async function WorldsPage() {
  const [session, worlds] = await Promise.all([
    getOptionalSession(),
    commerceGateway.listWorlds()
  ]);

  return <WorldsScreen session={session} worlds={worlds} />;
}
