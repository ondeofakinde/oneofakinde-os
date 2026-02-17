import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="read"
      route="/drops/:id/read"
      roles={["collector","creator"]}
      publicSafe={false}
      summary="full read consume surface"
    />
  );
}
