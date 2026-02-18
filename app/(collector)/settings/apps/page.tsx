import { RouteStub } from "@/components/route-stub";
import { requireSession } from "@/lib/server/session";

export default async function SettingsAppsPage() {
  await requireSession("/settings/apps");

  return (
    <RouteStub
      title="apps"
      route="/settings/apps"
      roles={["collector", "creator"]}
      publicSafe={false}
      summary="apps architecture route is wired for extension and integration controls."
    />
  );
}
