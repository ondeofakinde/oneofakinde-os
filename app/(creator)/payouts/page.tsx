import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { requireSessionRoles } from "@/lib/server/session";

export default async function PayoutsPage() {
  const session = await requireSessionRoles("/payouts", ["creator"]);
  return <OpsControlSurfaceScreen surface="payouts" session={session} />;
}
