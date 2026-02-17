import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="library"
      route="/library"
      roles={["collector","creator"]}
      publicSafe={false}
      summary="saved drop curation surface"
    />
  );
}
