import { HomeScreen } from "@/features/explore/home-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function IndexPage() {
  const [session, drops, worlds] = await Promise.all([
    getOptionalSession(),
    gateway.listDrops(),
    gateway.listWorlds()
  ]);

  return <HomeScreen session={session} drops={drops} worlds={worlds} />;
}
