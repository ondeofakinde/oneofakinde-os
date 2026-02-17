import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="read"
      route="/read"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="read hub"
    />
  );
}
