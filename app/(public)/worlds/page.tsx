import { WorldsScreen } from "@/features/explore/worlds-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function WorldsPage() {
  const [session, worlds] = await Promise.all([
    getOptionalSession(),
    gateway.listWorlds()
  ]);

  return <WorldsScreen session={session} worlds={worlds} />;
}
