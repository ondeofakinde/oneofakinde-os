import { RouteStub } from "@/components/route-stub";

export default function NotFound() {
  return (
    <RouteStub
      title="surface not found"
      route="404"
      roles={[]}
      publicSafe={true}
      summary="requested route is not defined in the current surface map"
    />
  );
}
