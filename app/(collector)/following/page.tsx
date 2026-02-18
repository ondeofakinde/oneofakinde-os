import { RouteStub } from "@/components/route-stub";
import { requireSession } from "@/lib/server/session";

export default async function FollowingPage() {
  await requireSession("/following");

  return (
    <RouteStub
      title="following"
      route="/following"
      roles={["collector", "creator"]}
      publicSafe={false}
      summary="following architecture route is wired for social graph and favorites users."
    />
  );
}
