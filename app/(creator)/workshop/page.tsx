import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="workshop"
      route="/workshop"
      roles={["creator"]}
      publicSafe={false}
      summary="creator back office"
    />
  );
}
