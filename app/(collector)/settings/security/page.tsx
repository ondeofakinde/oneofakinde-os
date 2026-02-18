import { RouteStub } from "@/components/route-stub";
import { requireSession } from "@/lib/server/session";

export default async function SettingsSecurityPage() {
  await requireSession("/settings/security");

  return (
    <RouteStub
      title="security"
      route="/settings/security"
      roles={["collector", "creator"]}
      publicSafe={false}
      summary="security architecture route is wired for session and credential controls."
    />
  );
}
