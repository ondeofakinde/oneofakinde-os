import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="photos preview"
      route="/drops/:id/preview/photos"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="photo preview surface"
    />
  );
}
