import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="drops in this world"
      route="/worlds/:id/drops"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="world drops table"
    />
  );
}
