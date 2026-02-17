import { HomeScreen } from "@/features/explore/home-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { getOptionalSession } from "@/lib/server/session";

export default async function IndexPage() {
  const [session, drops, worlds] = await Promise.all([
    getOptionalSession(),
    commerceGateway.listDrops(),
    commerceGateway.listWorlds()
  ]);

  return <HomeScreen session={session} drops={drops} worlds={worlds} />;
}
