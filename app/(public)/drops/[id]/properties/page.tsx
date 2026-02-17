import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="properties"
      route="/drops/:id/properties"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="drop properties tab"
    />
  );
}
