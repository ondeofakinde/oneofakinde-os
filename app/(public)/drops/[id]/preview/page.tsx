import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="preview"
      route="/drops/:id/preview"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="safe preview surface"
    />
  );
}
