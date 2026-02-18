import { RouteStub } from "@/components/route-stub";
import { requireSessionRoles } from "@/lib/server/session";

export default async function DashboardPage() {
  await requireSessionRoles("/dashboard", ["creator"]);

  return (
    <RouteStub
      title="dashboard"
      route="/dashboard"
      roles={["creator"]}
      publicSafe={false}
      summary="dashboard architecture route is ready for analytics, conversion, and sales metrics."
    />
  );
}
