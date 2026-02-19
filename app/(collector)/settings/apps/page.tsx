import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { requireSession } from "@/lib/server/session";

export default async function SettingsAppsPage() {
  const session = await requireSession("/settings/apps");
  return <OpsControlSurfaceScreen surface="settings_apps" session={session} />;
}
