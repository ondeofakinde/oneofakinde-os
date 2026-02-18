import { RouteStub } from "@/components/route-stub";
import { requireSessionRoles } from "@/lib/server/session";

export default async function PayoutsPage() {
  await requireSessionRoles("/payouts", ["creator"]);

  return (
    <RouteStub
      title="payouts"
      route="/payouts"
      roles={["creator"]}
      publicSafe={false}
      summary="payouts architecture route is ready for payout settings and status history."
    />
  );
}
