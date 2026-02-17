import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="photos"
      route="/drops/:id/photos"
      roles={["collector","creator"]}
      publicSafe={false}
      summary="full photos consume surface"
    />
  );
}
