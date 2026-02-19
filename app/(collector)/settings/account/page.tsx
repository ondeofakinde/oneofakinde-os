import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { requireSession } from "@/lib/server/session";

export default async function SettingsAccountPage() {
  const session = await requireSession("/settings/account");
  return <OpsControlSurfaceScreen surface="settings_account" session={session} />;
}
