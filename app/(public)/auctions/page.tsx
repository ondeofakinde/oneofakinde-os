import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function AuctionsPage() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  return <OpsControlSurfaceScreen surface="auctions" session={session} drops={drops} />;
}
