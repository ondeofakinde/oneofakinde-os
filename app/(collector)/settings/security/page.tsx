import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { requireSession } from "@/lib/server/session";

export default async function SettingsSecurityPage() {
  const session = await requireSession("/settings/security");
  return <OpsControlSurfaceScreen surface="settings_security" session={session} />;
}
