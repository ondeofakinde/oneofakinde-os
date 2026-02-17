import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="activity"
      route="/drops/:id/activity"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="drop activity tab"
    />
  );
}
