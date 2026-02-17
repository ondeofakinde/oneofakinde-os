import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="space setup"
      route="/space-setup"
      roles={["collector","creator"]}
      publicSafe={false}
      summary="first run destination setup"
    />
  );
}
