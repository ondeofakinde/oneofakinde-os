import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

export default async function InvestPage() {
  const session = await requireSession("/invest");
  const drops = await gateway.listDrops();
  return <OpsControlSurfaceScreen surface="invest" session={session} drops={drops} />;
}
