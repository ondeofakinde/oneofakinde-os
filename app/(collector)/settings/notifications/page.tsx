import { OpsControlSurfaceScreen } from "@/features/ops/ops-control-surface-screen";
import { requireSession } from "@/lib/server/session";

export default async function SettingsNotificationsPage() {
  const session = await requireSession("/settings/notifications");
  return <OpsControlSurfaceScreen surface="settings_notifications" session={session} />;
}
