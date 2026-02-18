import { RouteStub } from "@/components/route-stub";
import { requireSession } from "@/lib/server/session";

export default async function SettingsNotificationsPage() {
  await requireSession("/settings/notifications");

  return (
    <RouteStub
      title="notifications"
      route="/settings/notifications"
      roles={["collector", "creator"]}
      publicSafe={false}
      summary="notifications architecture route is wired for preference controls."
    />
  );
}
