import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";

export default async function CreatePage() {
  const session = await requireSessionRoles("/create", ["creator"]);
  const drops = await gateway.listDrops();
  return <OpsControlSurfaceScreen surface="create" session={session} drops={drops} />;
}
