import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="watch"
      route="/watch"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="watch hub"
    />
  );
}
