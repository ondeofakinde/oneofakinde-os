import { RouteStub } from "@/components/route-stub";
import { requireSessionRoles } from "@/lib/server/session";

export default async function CreatePage() {
  await requireSessionRoles("/create", ["creator"]);

  return (
    <RouteStub
      title="create"
      route="/create"
      roles={["creator"]}
      publicSafe={false}
      summary="create architecture route is ready for drop and world authoring tools."
    />
  );
}
