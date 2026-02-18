import { RouteStub } from "@/components/route-stub";
import { requireSessionRoles } from "@/lib/server/session";

export default async function MyCampaignsPage() {
  await requireSessionRoles("/my-campaigns", ["creator"]);

  return (
    <RouteStub
      title="my campaigns"
      route="/my-campaigns"
      roles={["creator"]}
      publicSafe={false}
      summary="campaigns architecture route is ready for campaign lifecycle management."
    />
  );
}
