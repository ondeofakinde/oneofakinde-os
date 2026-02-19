import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { requireSessionRoles } from "@/lib/server/session";

export default async function MyCampaignsPage() {
  const session = await requireSessionRoles("/my-campaigns", ["creator"]);
  return <OpsControlSurfaceScreen surface="campaigns" session={session} />;
}
