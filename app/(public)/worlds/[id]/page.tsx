import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="world"
      route="/worlds/:id"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="world detail surface"
    />
  );
}
