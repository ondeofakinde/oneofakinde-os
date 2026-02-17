import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="offers"
      route="/drops/:id/offers"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="drop offers tab"
    />
  );
}
