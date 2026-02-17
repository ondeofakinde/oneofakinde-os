import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="live now"
      route="/live-now"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="live now hub"
    />
  );
}
