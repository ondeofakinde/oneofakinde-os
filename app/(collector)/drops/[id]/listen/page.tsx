import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="listen"
      route="/drops/:id/listen"
      roles={["collector","creator"]}
      publicSafe={false}
      summary="full listen consume surface"
    />
  );
}
