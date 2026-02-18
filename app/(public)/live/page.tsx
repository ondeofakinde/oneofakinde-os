import { LiveNowScreen } from "@/features/hubs/live-now-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function LivePage() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  return <LiveNowScreen session={session} drops={drops} />;
}
