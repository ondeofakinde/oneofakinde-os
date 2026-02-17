import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="listen"
      route="/listen"
      roles={["public","collector","creator"]}
      publicSafe={true}
      summary="listen hub"
    />
  );
}
