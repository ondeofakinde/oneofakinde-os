import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

export default async function FollowingPage() {
  const session = await requireSession("/following");
  const drops = await gateway.listDrops();
  return <OpsControlSurfaceScreen surface="following" session={session} drops={drops} />;
}
