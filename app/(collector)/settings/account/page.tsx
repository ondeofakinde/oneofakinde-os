import { RouteStub } from "@/components/route-stub";
import { requireSession } from "@/lib/server/session";

export default async function SettingsAccountPage() {
  await requireSession("/settings/account");

  return (
    <RouteStub
      title="account details"
      route="/settings/account"
      roles={["collector", "creator"]}
      publicSafe={false}
      summary="account settings architecture route is wired for identity and contact controls."
    />
  );
}
