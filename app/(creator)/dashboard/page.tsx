import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";

export default async function DashboardPage() {
  const session = await requireSessionRoles("/dashboard", ["creator"]);
  const drops = await gateway.listDrops();
  return <OpsControlSurfaceScreen surface="dashboard" session={session} drops={drops} />;
}
