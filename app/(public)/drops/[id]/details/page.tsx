import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="details"
      route="/drops/:id/details"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="drop details tab"
    />
  );
}
